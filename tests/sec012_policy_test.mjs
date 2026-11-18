import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(path, 'utf8');
const index = read('backend/public/index.php');
const auth = read('backend/src/Middleware/AuthMiddleware.php');
const fileAccess = read('backend/public/sec003_file_access.php');
const maintenance = read('backend/src/Middleware/MaintenanceMiddleware.php');
const mfa = read('backend/public/mfa_routes.php');
const candidate = read('backend/public/candidate_auth_routes.php');
const change = read('frontend/src/pages/ChangePassword.jsx');
const ctx = read('frontend/src/contexts/AuthContext.jsx');
const adminSettings = read('frontend/src/pages/AdminSettings.jsx');
const employeeProfile = read('frontend/src/pages/EmployeeProfile.jsx');
const employeeMobileProfile = read('frontend/src/pages/EmployeeMobileProfile.jsx');
const version = read('backend/src/Utils/SessionVersion.php');
const otp = read('backend/src/Utils/OtpCode.php');

assert(index.includes("SessionVersion::revokeAll($conn"), 'logout must revoke server sessions');
assert(index.includes("new AuthMiddleware(['admin', 'employee', 'hr', 'manager', 'candidate'])"), 'logout must require real session auth');
assert(index.includes('token_version = token_version + 1'), 'password change/reset must invalidate old JWTs');
assert(index.includes('password_verify($currentPassword'), 'current password must be verified');
assert(index.includes('FOR UPDATE'), 'password change must lock user during verification');
assert(index.includes('OtpCode::digest($otp'), 'OTP must never be persisted as plaintext');
assert(index.includes('OtpCode::matches('), 'OTP verification must use keyed digests');
assert(!index.includes("$updateStmt->execute([$otp, $expiresAt"), 'plaintext email OTP must not be inserted');
assert.equal(index.split('RefreshSessions::newSession(').length - 1, 2,
  'password and OTP login must issue bounded JWT + rotating refresh');
assert(mfa.includes('RefreshSessions::newSession('), 'MFA session must issue rotating refresh');
assert(candidate.includes('RefreshSessions::newSession('), 'candidate session must issue rotating refresh');
assert(auth.includes('SessionVersion::matches($decoded, $userRow)'), 'all protected APIs require live revocation check');
assert(auth.includes('token_version FROM users'), 'middleware must read DB session generation');
assert(fileAccess.includes('SessionVersion::matches($claims, $user)'), 'private file cookie must reject revoked JWT');
assert(maintenance.includes('SessionVersion::matches($claims, $row)'), 'Admin maintenance exception must reject revoked JWT');
assert(version.includes("return $actual === 0"), 'legacy JWTs are valid only before the first revocation');
assert(otp.includes("hash_hmac('sha256'"), 'small OTP code-space requires keyed HMAC');
assert(adminSettings.includes("onClick={() => navigate('/change-password')}"), 'Admin Settings must link to personal password change');
assert(adminSettings.includes('type="button"'), 'Admin navigation must not submit global system settings');
assert(employeeProfile.includes("onClick={() => navigate('/change-password')}"), 'Employee desktop Profile must link to password change');
assert(employeeMobileProfile.includes("id: 'password', label: 'Change Password'"), 'Employee mobile Profile must display password option');
assert(employeeMobileProfile.includes("section.id === 'password' ? navigate('/change-password')"), 'Employee mobile password option must navigate to protected route');
assert(change.includes("isMandatory ? 'Mandatory Security Update' : 'Account Security'"), 'Voluntary password change must not be mislabeled mandatory');
assert(change.includes('navigate(returnPath)'), 'Voluntary password change must offer return navigation');
assert(change.includes('currentPassword, newPassword'), 'frontend must require current password');
assert(change.includes('signOut({ localOnly: true })'), 'after revocation client must clear token and cached PII');
assert(change.includes("navigate('/login'"), 'password change must require fresh sign-in');
assert(ctx.includes('options?.localOnly'), 'local-only signout must not reuse revoked token');
const access = read('backend/src/Utils/AccessToken.php');
const refresh = read('backend/src/Utils/RefreshSessions.php');
const schema = read('supabase/migrations/20261114_sec012_refresh_sessions.sql');
const axios = read('frontend/src/api/axios.js');
const native = read('frontend/android/app/src/main/java/com/example/acmehrms/NativeSessionClient.java');
const tracker = read('frontend/android/app/src/main/java/com/example/acmehrms/LocationTrackerService.java');
const store = read('frontend/android/app/src/main/java/com/example/acmehrms/TrackerTokenStore.java');
const plugin = read('frontend/android/app/src/main/java/com/example/acmehrms/LocationTrackerPlugin.java');
assert(!index.includes("60 * 60 * 24 * 365 * 10"), 'ten-year session minting must be gone');
assert(access.includes('public const MAX_TTL = 8 * 60 * 60'), 'access tokens capped at 8 hours');
assert(auth.includes('AccessToken::bounded($decoded)'), 'auth rejects long-life legacy JWT');
assert(fileAccess.includes('AccessToken::bounded($claims)'), 'private files reject long-life JWT');
assert(maintenance.includes('AccessToken::bounded($claims)'), 'maintenance exception rejects long-life JWT');
assert(index.includes("'/api/auth/refresh'"), 'refresh endpoint required');
assert(index.includes('RefreshSessions::rotate($conn'), 'refresh must rotate');
assert(index.includes("'X-HRMS-Refresh'"), 'CSRF-resistant custom header required');
assert(refresh.includes("hash('sha256', $secret)"), 'server stores only hash');
assert(refresh.includes('hash_equals('), 'constant-time rotation comparison');
assert(refresh.includes('SEC-018 R01') && refresh.includes('if (isset($used[$hash]))'),
  'only a previously consumed full secret may trigger immediate refresh-family revocation');
assert(!refresh.includes('REPLAY_GRACE_SECONDS'), 'no 30-second replay revocation exemption remains');
assert(!refresh.includes('token_version = token_version + 1'),
  'refresh replay must not revoke unrelated account sessions or Admin logins');
assert(refresh.includes('$conn->rollBack();'), 'unknown guessed secret must not revoke refresh family');
assert(refresh.includes('HttpOnly; SameSite=Strict'), 'browser refresh uses strict HttpOnly cookie');
assert(schema.includes('ENABLE ROW LEVEL SECURITY'), 'refresh table RLS enabled');
assert(schema.includes('REVOKE ALL PRIVILEGES'), 'refresh secrets not accessible to public Data API');
assert(axios.includes('sharedRefresh'), 'browser dedupes concurrent refresh attempts');
assert(axios.includes('navigator.locks.request'), 'browser coordinates cross-tab refresh where supported');
// SEC-021: web access JWTs have moved entirely into HttpOnly cookies.
assert(axios.includes('browserCsrfToken()'), 'browser unsafe requests must attach CSRF header');
assert(axios.includes('getNativeAccessToken()'), 'Android fetches bearer credentials from native Keystore');
assert(!axios.includes("localStorage.getItem('token')"),
  'browser must never read access JWTs from Web Storage');
assert(!axios.includes("localStorage.setItem('token'"),
  'browser must never save refreshed access JWTs into Web Storage');
assert(axios.includes("'/api/auth/refresh'"), 'browser sends cookie-only refresh');
assert(native.includes('static synchronized String refresh('), 'Android must serialize native refresh');
assert(native.includes('TrackerTokenStore.saveSession('), 'native refresh secret stored in Keystore');
assert(!native.includes('Log.'), 'native refresh must not log secrets');
assert(tracker.includes('NativeSessionClient.accessOrRefresh(this)'), 'Android background punches independently renew');
assert(tracker.includes('!retriedAfterRefresh'), 'one retry only after 401');
assert(store.includes('AndroidKeyStore'), 'Android refresh encrypted under Keystore');
assert(plugin.includes('getSessionAccessToken'), 'native access sync supported');
assert(!read('frontend/src/api/nativeSession.js').includes("localStorage.setItem('refresh"),
  'native refresh token must not be stored in WebView localStorage');
console.log('SEC-012 stage 2 source and security regression policy PASSED');
