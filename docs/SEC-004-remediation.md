# SEC-004 — Gemini TLS verification and personal-data isolation

## Security issue

Previous employee/admin chatbot integrations disabled cURL TLS peer
verification and forwarded raw HRMS employee data, salaries, PAN, emails,
phone numbers, loan applicants and full chat history to a third-party model.

## Implemented mitigation

- Both authenticated chatbot endpoints use the shared
  `backend/public/sec004_gemini_security.php` client.
- The only outbound prompts are **predefined, static, general HR FAQs**
  from an exact-match allowlist. Raw questions, chat history, company data,
  payroll, PAN, employee records and applicant records are never forwarded.
- All other requests use the existing authenticated PHP local rule engines,
  preserving personal/admin answers without disclosing them externally.
- If Gemini is unavailable, exact public FAQ questions use a **static, private-data-free local response** before the personal-data keyword engine. For example, `What is paid leave?` explains the term instead of showing an employee's leave balance.
- cURL requires TLS certificate validation (`CURLOPT_SSL_VERIFYPEER=true`)
  and hostname validation (`CURLOPT_SSL_VERIFYHOST=2`). Redirects are
  disabled and all transport errors fall back to the local rule engines.
- The Gemini key is passed only as a secret HTTP header over HTTPS,
  never in URL query parameters or browser responses.
- The backend container installs the CA certificates bundle.

## Configuration

Only `GEMINI_API_KEY` enables the optional general FAQ feature in the
server environment. `APP_CHAT_KEY` is **not** automatically treated as
a Gemini credential. Without a configured key the local HRMS chatbots
still work. Never expose a Gemini key in the frontend or Git.

## Testing

Run:

```bash
php -l backend/public/sec004_gemini_security.php
php -l backend/public/employee_chatbot_routes.php
php -l backend/public/admin_chatbot_routes.php
php tests/sec004_gemini_security_test.php
```

Negative cases include PAN numbers, salaries, employee names, email,
loan/customer details and appended PII in an otherwise allowlisted FAQ.
Generic FAQ payloads are built only from fixed template strings, never
from the original message.

On a live server, verify:
1. An employee can ask "What is my salary?" and get the local, private
   answer even when Gemini is configured.
2. An admin can ask "Show salaries overview" and receive the local
   authorized answer without exposing workforce records to Gemini.
3. "What is paid leave?" must give a **general definition**, whether Gemini is configured or not. It must **not** display `Your Leave Summary` or any employee balances.
   "How many paid leaves do I have?" must still return the employee-specific local answer.
4. Without a trusted TLS certificate, an outbound request fails closed
   and uses the local fallback; do not disable verification to fix TLS.

## Limitations

The Gemini integration is intentionally restricted to generic FAQ prompts.
Expanded external-AI use requires a separate reviewed design for
explicit consent, data classification, and hard data-loss prevention.
This remediation does not address unrelated data-handling findings.
