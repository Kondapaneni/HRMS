import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

// Regression tests for the login screen's Back navigation and OTP method
// switches. Execute the actual reset handlers with simulated React setters.
const source = readFileSync('frontend/src/pages/Login.jsx', 'utf8');
const start = source.indexOf("  const resetLoginFlow = (nextMethod = 'password') => {");
const changeStart = source.indexOf('  const handleChangeOtpEmail = () => {', start);
const nextStart = source.indexOf('  const handlePasswordLogin = async', changeStart);
assert(start >= 0 && changeStart > start && nextStart > changeStart,
  'Login reset handlers must exist');

const sourceToTest = source.slice(start, nextStart);
const setters = [
  'setEmail', 'setPassword', 'setShowPassword', 'setOtp', 'setOtpSent',
  'setOtpCountdown', 'setMfaPending', 'setMfaToken', 'setMfaCode',
  'setMfaMethod', 'setBackupCode', 'setError', 'setSuccessMessage',
  'setLoginMethod'
];
const values = Object.fromEntries(setters.map(x => [x.replace(/^set/, ''), 'old-value']));
values.Otp = ['1','2','3','4','5','6'];
values.MfaCode = ['6','5','4','3','2','1'];
values.OtpSent = true;
values.MfaPending = true;
values.OtpCountdown = 37;
values.ShowPassword = true;
values.LoginMethod = 'otp';
const allowAutofillSyncRef = {current: true};
const sandbox = {allowAutofillSyncRef};
for(const setter of setters){
  sandbox[setter] = value => { values[setter.replace(/^set/, '')] = value; };
}
runInNewContext(sourceToTest + `
  globalReset = resetLoginFlow;
  globalChangeEmail = handleChangeOtpEmail;`, sandbox);

function emptySix(a){
  assert.deepEqual(Array.from(a), ['', '', '', '', '', '']);
}
sandbox.globalReset();
assert.equal(values.Email, '');
assert.equal(values.Password, '');
assert.equal(values.ShowPassword, false);
emptySix(values.Otp);
assert.equal(values.OtpSent, false);
assert.equal(values.OtpCountdown, 0);
assert.equal(values.MfaPending, false);
assert.equal(values.MfaToken, '');
emptySix(values.MfaCode);
assert.equal(values.MfaMethod, 'totp');
assert.equal(values.BackupCode, '');
assert.equal(values.Error, '');
assert.equal(values.SuccessMessage, '');
assert.equal(values.LoginMethod, 'password');
assert.equal(allowAutofillSyncRef.current, false);
console.log('PASS: MFA Back resets all sensitive fields and returns to fresh password login');

values.Email = 'test@example.invalid';
values.Password = 'not-a-real-password';
values.OtpSent = true;
values.MfaToken = 'old-pending-token';
allowAutofillSyncRef.current = true;
sandbox.globalReset('otp');
assert.equal(values.LoginMethod, 'otp');
assert.equal(values.Email, '');
assert.equal(values.Password, '');
assert.equal(values.MfaToken, '');
assert.equal(values.OtpSent, false);
assert.equal(allowAutofillSyncRef.current, false);
console.log('PASS: switching login methods clears old account and challenge information');

values.Email = 'stale@example.invalid';
values.OtpSent = true;
values.OtpCountdown = 40;
values.Otp = ['1','2','3','4','5','6'];
sandbox.globalChangeEmail();
assert.equal(values.Email, '');
assert.equal(values.OtpSent, false);
assert.equal(values.OtpCountdown, 0);
emptySix(values.Otp);
console.log('PASS: Change email clears previous email and OTP code');

assert(source.includes('onClick={() => resetLoginFlow()}'),
  'MFA Back button invokes complete reset');
assert(source.includes("onClick={() => resetLoginFlow(loginMethod === 'password' ? 'otp' : 'password')}"),
  'login method toggle invokes complete reset');
assert(source.includes('onClick={handleChangeOtpEmail}'),
  'Change email button invokes account and OTP cleanup');
assert(source.includes('if (!allowAutofillSyncRef.current) return;'),
  'legacy credential autofill sync cannot undo an intentional reset');
assert(source.includes('setOtpCountdown(0);\n        setMfaPending(true);'),
  'successful email OTP clears the used OTP before MFA');
assert(source.includes("setPassword('');\n        setMfaPending(true);"),
  'successful password first factor clears password before MFA');
assert(source.includes("setOtp(['', '', '', '', '', '']);\n      setOtpSent(true);"),
  'resending an email code clears the previous digits');
console.log('SEC-008 login state reset regressions passed');
