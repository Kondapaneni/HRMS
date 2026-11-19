import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const auth = readFileSync('frontend/src/contexts/AuthContext.jsx', 'utf8');
const login = readFileSync('frontend/src/pages/Login.jsx', 'utf8');
const server = readFileSync('backend/public/index.php', 'utf8');
const middleware = readFileSync('backend/src/Middleware/AuthMiddleware.php', 'utf8');
const mfaCard = readFileSync('frontend/src/components/MfaSecurityCard.jsx', 'utf8');

const otpAuthStart = auth.indexOf('const signInWithOtp = async');
const otpAuthEnd = auth.indexOf('const signOut = async', otpAuthStart);
assert(otpAuthStart >= 0 && otpAuthEnd > otpAuthStart, 'OTP login context function exists');
const context = auth.slice(otpAuthStart, otpAuthEnd);
assert(!auth.includes("localStorage.setItem('token'"), 'SEC-021: no bearer JWT persistent browser storage');
assert(context.includes('if (response.data?.mfaRequired)'));
// OTP/TOTP/password now share one verified-login finalizer. The challenge
// must be returned before that finalizer can ever install a session token.
const finalizerStart = auth.indexOf('const finishVerifiedLogin = async');
const finalizerEnd = auth.indexOf('const signIn = async', finalizerStart);
assert(finalizerStart >= 0 && finalizerEnd > finalizerStart, 'Verified-login finalizer exists');
const finalizer = auth.slice(finalizerStart, finalizerEnd);
assert(context.indexOf('if (response.data?.mfaRequired)') < context.indexOf('return finishVerifiedLogin(response.data)'),
  'MFA pending OTP token must return without calling authenticated finalizer');
assert.match(finalizer, /if \(!token\) return userData/,
  'Missing token cannot create an authenticated session');
assert.match(finalizer, /setAccessToken\(token\)/,
  'Only verified, completed login may install the authenticated access token');
assert.match(finalizer, /queryClient\.clear\(\)/,
  'Completed login must clear previous-account private cache');

const otpUiStart = login.indexOf('const handleVerifyOtp = async');
const otpUiEnd = login.indexOf('\n\n\n  return (', otpUiStart);
assert(otpUiStart >= 0 && otpUiEnd > otpUiStart, 'OTP UI function exists');
const otpUi = login.slice(otpUiStart, otpUiEnd);
assert(otpUi.includes('if (userData?.mfaRequired)'), 'OTP result triggers authenticator UI');
assert(otpUi.indexOf('if (userData?.mfaRequired)') < otpUi.indexOf('if (userData.forcePasswordChange)'),
  'OTP MFA prompt precedes authenticated navigation');

assert.equal((server.match(/sec008MfaRequired\(\$conn, \$user\)/g) || []).length, 2,
  'both password and OTP routes enforce same MFA requirement');
assert(middleware.includes("A completed sign-in session is required."),
  'protected routes reject incomplete first-factor JWTs');

// The admin permission gate controls whether employees can even see setup.
assert(mfaCard.includes('if (isLoading || !mfaStatus?.authorized)'),
  'Employee MFA settings must be hidden unless admin grants the feature');
assert(mfaCard.includes('return null;'),
  'Unauthorized MFA settings must not render');

console.log('SEC-008 browser and backend MFA regression checks passed');
