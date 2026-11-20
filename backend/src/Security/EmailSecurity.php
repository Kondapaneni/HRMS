<?php
declare(strict_types=1);

namespace App\Security;

use PDO;
use RuntimeException;

/**
 * SEC-015: HRMS-owned outbound recruitment and onboarding email templates.
 * Callers may select an allowed notification category and an existing application;
 * they may not supply email recipients, subjects, HTML or arbitrary links.
 */
final class EmailSecurity
{
    private const RECRUITMENT_TYPES = [
        'shortlisted' => 'candidate_shortlisted_email.html',
        'rejected' => 'candidate_rejected_email.html',
        'interview' => 'candidate_interview_email.html',
        'offer' => 'candidate_offer_email.html',
        'status' => 'candidate_status_update_email.html',
        'documents_verified' => 'candidate_documents_verified_email.html',
    ];

    private const REQUIRED_DOCUMENT_TYPES = [
        'signed_offer_letter', 'aadhaar_pan', 'photo', 'community_certificate',
        'academic_certificates', 'police_verification', 'family_aadhaar_pan',
        'nominee_esi', 'bank_cheques', 'fitness_certificate',
    ];

    public static function escape(string $value): string
    {
        return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    }

    public static function safeSubject(string $value): string
    {
        // No recipient-supplied data may inject email headers.
        $clean = preg_replace('/[\x00-\x1F\x7F]/', ' ', $value);
        return trim(substr((string)$clean, 0, 180));
    }

    public static function frontendOrigin(): string
    {
        $origin = rtrim(trim((string)($_ENV['FRONTEND_URL'] ?? getenv('FRONTEND_URL') ?: '')), '/');
        // Never use request Host, Origin or X-Forwarded-Host to construct email links.
        if (filter_var($origin, FILTER_VALIDATE_URL)
            && str_starts_with(strtolower($origin), 'https://')
            && parse_url($origin, PHP_URL_USER) === null
            && parse_url($origin, PHP_URL_PASS) === null
            && parse_url($origin, PHP_URL_QUERY) === null
            && parse_url($origin, PHP_URL_FRAGMENT) === null) {
            return $origin;
        }
        return 'https://hrms-qwv3.onrender.com';
    }

    public static function render(string $template, array $values): string
    {
        $file = __DIR__ . '/../Templates/' . $template;
        $html = @file_get_contents($file);
        if (!is_string($html) || $html === '') {
            throw new RuntimeException('Email template unavailable');
        }
        $fields = [];
        foreach ($values as $key => $value) {
            $fields['{{' . $key . '}}'] = self::escape((string)$value);
        }
        // strtr is single-pass: escaped user input can never become a template.
        $body = strtr($html, $fields);
        if (preg_match('/\{\{[a-zA-Z][a-zA-Z0-9]*\}\}/', $body)) {
            throw new RuntimeException('Email template is incomplete');
        }
        return $body;
    }

    /** @return array{to:string,subject:string,body:string} */
    public static function recruitment(PDO $conn, string $applicationId, string $type): array
    {
        if (!preg_match('/\A[0-9a-fA-F]{8}-(?:[0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}\z/', $applicationId)
            || !isset(self::RECRUITMENT_TYPES[$type])) {
            throw new \InvalidArgumentException('Invalid application or notification type');
        }

        $stmt = $conn->prepare('
            SELECT a.id, a.status, a.candidate_id, u.email, u."firstName", j.title AS job_title
            FROM applications a
            INNER JOIN users u ON u.id = a.candidate_id
            INNER JOIN jobs j ON j.id = a.job_id
            WHERE a.id = ?
        ');
        $stmt->execute([$applicationId]);
        $application = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$application) {
            throw new \DomainException('Application not found');
        }
        $email = (string)($application['email'] ?? '');
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new \DomainException('Applicant has no valid account email');
        }
        $status = (string)($application['status'] ?? '');

        $allowed = match ($type) {
            'shortlisted' => $status === 'Shortlisted',
            'rejected' => $status === 'Rejected',
            'interview' => (bool)preg_match('/\A(?:[1-9][0-9]{0,5}(?:st|nd|rd|th) Round Interview|Final Round Interview|Interview)\z/', $status),
            'offer' => in_array($status, ['Selected', 'Hired'], true),
            'status' => in_array($status, ['Applied', 'Selected', 'Hired', 'Converted to Employee'], true),
            'documents_verified' => in_array($status, ['Selected', 'Hired'], true),
            default => false,
        };
        if (!$allowed) {
            throw new \DomainException('Notification does not match current application status');
        }

        if ($type === 'documents_verified') {
            $required = self::REQUIRED_DOCUMENT_TYPES;
            $placeholders = implode(',', array_fill(0, count($required), '?'));
            $verified = $conn->prepare(
                "SELECT COUNT(DISTINCT document_type) FROM candidate_documents
                 WHERE candidate_id = ? AND status = 'verified'
                 AND document_type IN ($placeholders)"
            );
            $verified->execute(array_merge([(string)$application['candidate_id']], $required));
            if ((int)$verified->fetchColumn() !== count($required)) {
                throw new \DomainException('Required documents are not all verified');
            }
        }

        $jobTitle = (string)($application['job_title'] ?? '');
        $fields = [
            'firstName' => trim((string)($application['firstName'] ?? '')) ?: 'Candidate',
            'jobTitle' => $jobTitle,
            'applicationStatus' => $status,
            'interviewRound' => $status,
            'additionalNotes' => '',
            'currentYear' => date('Y'),
        ];

        if ($type === 'interview') {
            $noteStmt = $conn->prepare('
                SELECT notes FROM application_timeline
                WHERE application_id = ? AND status_change = ?
                ORDER BY created_at DESC LIMIT 1
            ');
            $noteStmt->execute([$applicationId, $status]);
            $fields['additionalNotes'] = substr(
                trim((string)($noteStmt->fetchColumn() ?: 'Please check your candidate portal for scheduling details.')),
                0, 1000
            );
        }

        $subject = match ($type) {
            'shortlisted' => "Good News! You've been shortlisted for " . $jobTitle,
            'rejected' => 'Update regarding your application for ' . $jobTitle,
            'interview' => 'Interview Invitation for ' . $jobTitle,
            'offer' => 'Job Offer: ' . $jobTitle,
            'documents_verified' => 'Document Verification Successful',
            'status' => 'Update on your application for ' . $jobTitle,
        };

        return [
            'to' => $email,
            'subject' => self::safeSubject($subject),
            'body' => self::render(self::RECRUITMENT_TYPES[$type], $fields),
        ];
    }

    public static function welcome(string $firstName, string $email, string $token): string
    {
        if (!preg_match('/\A[a-f0-9]{64}\z/', $token)) {
            throw new \InvalidArgumentException('Invalid setup token');
        }
        return self::render('welcome_email.html', [
            'firstName' => $firstName,
            'email' => $email,
            'setupLink' => self::frontendOrigin() . '/reset-password?token=' . rawurlencode($token),
            'currentYear' => date('Y'),
        ]);
    }
}
