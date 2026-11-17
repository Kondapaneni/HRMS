import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const email = readFileSync('backend/src/Templates/candidate_activate_email.html', 'utf8');
const activation = readFileSync('frontend/src/pages/CandidateActivate.jsx', 'utf8');
const login = readFileSync('frontend/src/pages/CandidateLogin.jsx', 'utf8');
const desktop = readFileSync('frontend/src/pages/CandidateProfile.jsx', 'utf8');
const mobile = readFileSync('frontend/src/pages/CandidateMobileProfile.jsx', 'utf8');
const backend = readFileSync('backend/public/candidate_auth_routes.php', 'utf8');

assert.match(email, /Activate Candidate Account/, 'Activation email must contain CTA');
assert.ok((email.match(/href="{{activationLink}}"/g) || []).length >= 2,
  'Email CTA and backup link must both use the server-generated token URL');
assert.match(backend, /candidateActivationEmailBody\(/,
  'Registration and resend must use the approved server-side activation template');
assert.match(backend, /\/api\/candidate\/resend-activation/,
  'Candidate must have a recovery path for missing/previous emails');
assert.match(backend, /RateLimiter::credentialLockout\(/,
  'Activation resend must be rate limited');
assert.match(backend, /RateLimiter::recordCredentialAttempt\(/,
  'Activation resend must count attempts regardless of account existence');
assert.match(backend, /reset_token_expires > CURRENT_TIMESTAMP/,
  'Activation tokens must expire');
assert.match(backend, /UPDATE users SET [^\n]*reset_token = NULL/,
  'Activation tokens must be consumed atomically');
assert.match(activation, /onClick={activateAccount}/,
  'Candidate activation must require an explicit button click');
assert.match(activation, />\s*Activate Account\s*</,
  'Candidate activation button must be visible');
assert.doesNotMatch(activation, /\bactivateAccount\(\);/,
  'Activation must not happen on page load, including link prefetch');
assert.match(login, /Resend activation email/,
  'Inactive candidates must be able to request a replacement link');

for (const [name, component] of [['desktop', desktop], ['mobile', mobile]]) {
  assert.match(component, /accept="\.pdf,application\/pdf"/,
    name + ' resume file chooser must accept only PDFs');
  assert.doesNotMatch(component, /\.pdf,\.doc,\.docx/,
    name + ' resume file chooser must not offer Word files');
}
assert.match(desktop, /Please upload a PDF resume only\./,
  'Resume handler must reject non-PDF files before upload');
assert.match(desktop, /5 \* 1024 \* 1024/,
  'Resume handler must enforce the advertised 5 MB limit');
assert.match(desktop, /PDF only \(Max 5 MB\)/,
  'Desktop caption must match PDF-only policy');

console.log('Candidate activation email/button/resend and PDF-only resume source checks PASS');
