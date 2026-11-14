<?php
declare(strict_types=1);

require __DIR__ . '/../backend/vendor/autoload.php';

use App\Utils\SessionVersion;
use App\Utils\OtpCode;

function test012(bool $ok, string $message): void {
    if (!$ok) { fwrite(STDERR, "FAIL SEC-012: {$message}\n"); exit(1); }
}
$secret = 'SEC012_TEST_SECRET_ONLY_NEVER_PRODUCTION';
$otp = '327841';
$hashed = OtpCode::digest($otp, $secret);
test012(str_starts_with($hashed, 'hmac-sha256:'), 'email OTP stored with digest marker');
test012(!str_contains($hashed, $otp), 'plaintext OTP not stored in users.otp_code');
test012(OtpCode::matches($hashed, $otp, $secret), 'correct HMAC OTP matches');
test012(!OtpCode::matches($hashed, '327842', $secret), 'wrong code rejected');
test012(!OtpCode::matches($hashed, $otp, 'wrong-secret'), 'wrong signing key rejected');
test012(OtpCode::matches($otp, $otp, $secret), 'pre-deployment 10-minute OTP can finish');
test012(!OtpCode::matches('hello', $otp, $secret), 'invalid plaintext legacy code rejected');
test012(!OtpCode::matches($hashed, '32784', $secret), 'malformed OTP rejected');
test012(!str_contains($hashed, $otp), 'digest does not include raw OTP');
test012(SessionVersion::matches((object)['tv' => 3], ['token_version' => 3]), 'matching current version');
test012(!SessionVersion::matches((object)['tv' => 2], ['token_version' => 3]), 'revoked version denied');
test012(!SessionVersion::matches((object)['tv' => '3'], ['token_version' => 3]), 'string version denied');
test012(!SessionVersion::matches((object)['tv' => -1], ['token_version' => 0]), 'negative version denied');
test012(SessionVersion::matches((object)[], ['token_version' => 0]), 'legacy token permitted only before first revocation');
test012(!SessionVersion::matches((object)[], ['token_version' => 1]), 'legacy token denied after revocation');
try { SessionVersion::matches((object)['tv'=>0], []); test012(false, 'missing DB column must deny'); }
catch (RuntimeException $e) { /* Correct fail-closed behavior. */ }
echo "SEC-012 OTP and token-version helper assertions passed\n";
