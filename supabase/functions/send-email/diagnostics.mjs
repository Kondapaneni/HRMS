// SMTP diagnostics must be useful without exposing app passwords, addresses,
// recipients, message bodies, provider responses or untrusted exception text.
const allowedCodes = new Set([
  'EAUTH', 'ECONNECTION', 'ETIMEDOUT', 'ESOCKET', 'EENVELOPE',
  'EMESSAGE', 'ENOTFOUND', 'ECONNREFUSED', 'EHOSTUNREACH',
]);
const allowedStages = new Set([
  'claim', 'gmail-user-missing', 'gmail-app-password-missing',
  'message-invalid', 'smtp-send', 'queue-complete',
]);

export function gmailCredentials(env) {
  const user = (env.get('GMAIL_USER') || '').trim();
  // Google displays App Passwords grouped with separator spaces.
  // Remove separators without changing any non-whitespace characters.
  const pass = (env.get('GMAIL_APP_PASSWORD') || '').replace(/\s+/g, '');
  return { user, pass };
}

export function safeEmailFailure(stage, error) {
  const safeStage = allowedStages.has(stage) ? stage : 'unknown';
  const code = error && typeof error.code === 'string' && allowedCodes.has(error.code)
    ? error.code : 'unknown';
  const responseCode = error && Number.isInteger(error.responseCode)
    && error.responseCode >= 400 && error.responseCode <= 599
    ? error.responseCode : 'none';
  return `SEC-002: email delivery failed stage=${safeStage} code=${code} smtp_status=${responseCode}`;
}
