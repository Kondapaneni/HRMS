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
assert(index.includes("'tv' => SessionVersion::fromRow($user)"), 'password/OTP sign-in must version the JWT');
assert(mfa.includes("'tv' => SessionVersion::fromRow($user)"), 'MFA sign-in must version the JWT');
assert(candidate.includes("'tv' => SessionVersion::fromRow($user)"), 'candidate sign-in must version the JWT');
assert(auth.includes('SessionVersion::matches($decoded, $userRow)'), 'all protected APIs require live revocation check');
assert(auth.includes('token_version FROM users'), 'middleware must read DB session generation');
assert(fileAccess.includes('SessionVersion::matches($claims, $user)'), 'private file cookie must reject revoked JWT');
assert(maintenance.includes('SessionVersion::matches($claims, $row)'), 'Admin maintenance exception must reject revoked JWT');
assert(version.includes("return $actual === 0"), 'legacy JWTs are valid only before the first revocation');
assert(otp.includes("hash_hmac('sha256'"), 'small OTP code-space requires keyed HMAC');
assert(change.includes('currentPassword, newPassword'), 'frontend must require current password');
assert(change.includes('signOut({ localOnly: true })'), 'after revocation client must clear token and cached PII');
assert(change.includes("navigate('/login'"), 'password change must require fresh sign-in');
assert(ctx.includes('options?.localOnly'), 'local-only signout must not reuse revoked token');
assert(index.includes("60 * 60 * 24 * 365 * 10"),
  'stage 1 explicitly leaves legacy JWT TTL issue open until refresh-token and native tracking rollout');
console.log('SEC-012 stage 1 source and security regression policy PASSED');
