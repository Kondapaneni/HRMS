<?php
/**
 * SEC-004: Do not send HRMS records or arbitrary chat text to an external LLM.
 *
 * Only exact, predefined, non-personal FAQ prompts are eligible for Gemini.
 * All employee/admin-specific questions and all conversation history remain in
 * the authenticated PHP local rule engines.
 */
function sec004PublicFaqPrompt(string $message): ?string
{
    $normalized = strtolower(trim((string) (preg_replace('/\s+/', ' ', $message) ?? '')));
    $normalized = rtrim($normalized, " \t\r\n.!?");

    $questions = [
        'what is paid leave' => 'Explain the general concept of paid leave in an HR policy, without referring to an individual or a specific company.',
        'what is unpaid leave' => 'Explain the general concept of unpaid leave in an HR policy, without referring to an individual or a specific company.',
        'what is sick leave' => 'Explain the general concept of sick leave in an HR policy, without referring to an individual or a specific company.',
        'how do i apply for leave' => 'Explain generic steps for requesting leave in an employee self-service HR portal. Do not assume any company-specific rules.',
        'how to apply for leave' => 'Explain generic steps for requesting leave in an employee self-service HR portal. Do not assume any company-specific rules.',
        'how do i request leave' => 'Explain generic steps for requesting leave in an employee self-service HR portal. Do not assume any company-specific rules.',
        'how do i mark attendance' => 'Explain in general how attendance check-in and check-out work in an employee self-service HR portal.',
        'how do i check in' => 'Explain in general how attendance check-in and check-out work in an employee self-service HR portal.',
        'how do i submit an expense claim' => 'Explain generic steps for filing an expense reimbursement claim in an HR portal.',
        'how to submit an expense claim' => 'Explain generic steps for filing an expense reimbursement claim in an HR portal.',
        'what is a payslip' => 'Explain generally what a payslip is and its usual components.',
        'what is gross salary' => 'Explain generally the meaning of gross salary without using any personal financial data.',
        'what is net salary' => 'Explain generally the meaning of net salary without using any personal financial data.',
        'what is employee onboarding' => 'Explain in general what employee onboarding means.',
        'what is a performance review' => 'Explain in general what a performance review means in an organization.',
    ];

    return $questions[$normalized] ?? null;
}

/**
 * Safe local fallback for approved general HR FAQs.
 *
 * If Gemini is not configured or unavailable, NEVER pass these questions
 * into the personal HRMS keyword engine (e.g. "paid leave" would otherwise
 * produce the employee's private leave balances instead of a definition).
 * Every response is a fixed string and contains no employee records.
 */
function sec004LocalFaqResponse(string $message): ?string
{
    if (sec004PublicFaqPrompt($message) === null) return null;

    $normalized = strtolower(trim((string) (preg_replace('/\\s+/', ' ', $message) ?? '')));
    $normalized = rtrim($normalized, " \\t\\r\\n.!?");

    $answers = [
        'what is paid leave' => "### Paid Leave\\nPaid leave is approved time away from work during which an employee continues to receive pay, subject to the employer's leave policy. The amount available depends on the applicable policy and individual leave entitlement.",
        'what is unpaid leave' => "### Unpaid Leave\\nUnpaid leave is approved time away from work for which the employee does not receive regular pay. Eligibility and approval depend on the employer's policy.",
        'what is sick leave' => "### Sick Leave\\nSick leave is time away from work because of illness, injury, or a health-related need, according to the employer's policy. Whether it is paid depends on the policy and applicable law.",
        'how do i apply for leave' => "### Requesting Leave\\nOpen the Leaves section in your HR portal, choose Apply Leave, select the leave type and dates, enter the reason if required, and submit for approval. Exact steps depend on your company's workflow.",
        'how to apply for leave' => "### Requesting Leave\\nOpen the Leaves section in your HR portal, choose Apply Leave, select the leave type and dates, enter the reason if required, and submit for approval. Exact steps depend on your company's workflow.",
        'how do i request leave' => "### Requesting Leave\\nOpen the Leaves section in your HR portal, choose Apply Leave, select the leave type and dates, enter the reason if required, and submit for approval. Exact steps depend on your company's workflow.",
        'how do i mark attendance' => "### Marking Attendance\\nIn a typical HR portal, open Attendance, check in when you start work, and check out when your shift ends. Follow your organization's attendance rules.",
        'how do i check in' => "### Checking In\\nIn a typical HR portal, open Attendance and select Check In at the start of your shift. Your organization may require location or other verification.",
        'how do i submit an expense claim' => "### Expense Claims\\nOpen Expenses, choose a new claim, enter the expense details, attach the supporting receipt, and submit it for review according to your organization's policy.",
        'how to submit an expense claim' => "### Expense Claims\\nOpen Expenses, choose a new claim, enter the expense details, attach the supporting receipt, and submit it for review according to your organization's policy.",
        'what is a payslip' => "### Payslip\\nA payslip is a record of pay for a particular pay period. It commonly shows gross earnings, deductions, and net pay.",
        'what is gross salary' => "### Gross Salary\\nGross salary is total pay before deductions such as tax or other payroll withholdings. Its exact components depend on the employment agreement and payroll system.",
        'what is net salary' => "### Net Salary\\nNet salary is the amount received after applicable taxes and other deductions are taken from gross pay.",
        'what is employee onboarding' => "### Employee Onboarding\\nEmployee onboarding introduces a new employee to the organization, role, policies, tools, and team.",
        'what is a performance review' => "### Performance Review\\nA performance review is a discussion and assessment of an employee's work, achievements, goals, and areas for development.",
    ];

    return $answers[$normalized] ?? null;
}

/**
 * Return null for any query that is not an exact FAQ allowlist match.
 * The returned payload contains no user input, HR records, or chat history.
 */
function sec004GeminiFaqPayload(string $message): ?array
{
    $publicPrompt = sec004PublicFaqPrompt($message);
    if ($publicPrompt === null) return null;

    return [
        'system_instruction' => [
            'parts' => [[
                'text' => 'You are an HR glossary and general education assistant. Answer only general HR process and terminology questions. No employee, applicant, payroll, tax, bank, attendance or company records are provided. Never invent company-specific policies or employee data. Keep answers concise and professional.'
            ]]
        ],
        'contents' => [
            ['role' => 'user', 'parts' => [['text' => $publicPrompt]]]
        ],
    ];
}

/**
 * Only a pre-approved static FAQ can reach Gemini. Outbound TLS verification is
 * mandatory; network errors fall back to the local HRMS engine.
 */
function sec004CallGeminiPublicFaq(string $apiKey, string $message): ?string
{
    $payload = sec004GeminiFaqPayload($message);
    if ($payload === null || trim($apiKey) === '') return null;

    $jsonPayload = json_encode($payload, JSON_UNESCAPED_SLASHES);
    if ($jsonPayload === false) return null;

    // A single supported model avoids repeated external requests on failures.
    $url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
    $ch = curl_init($url);
    if ($ch === false) return null;

    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $jsonPayload,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'x-goog-api-key: ' . $apiKey,
        ],
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_SSL_VERIFYHOST => 2,
        CURLOPT_FOLLOWLOCATION => false,
        CURLOPT_CONNECTTIMEOUT => 4,
        CURLOPT_TIMEOUT => 10,
    ]);

    $raw = curl_exec($ch);
    $httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($raw === false || $httpCode !== 200) return null;
    $decoded = json_decode($raw, true);
    $parts = $decoded['candidates'][0]['content']['parts'] ?? [];
    if (!is_array($parts)) return null;

    $textParts = [];
    foreach ($parts as $part) {
        if (is_array($part) && !empty($part['text']) && empty($part['thought'])) {
            $textParts[] = $part['text'];
        }
    }

    $answer = trim(implode("\n", $textParts));
    return $answer !== '' ? $answer : null;
}
