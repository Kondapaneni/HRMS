# SEC-007 — HTTP security headers and CORS allowlist

**Severity:** Medium. **Implementation:** PR on `fix/sec-007-headers-cors`. **Closure:** Pending CI, live deployment and application regression verification.

## Scope and fixes

1. The production Apache `backend/public/.htaccess` now adds security headers to the SPA, static files, PHP responses and HTTP error responses:
   - `X-Content-Type-Options: nosniff`
   - `X-Frame-Options: SAMEORIGIN`
   - `Referrer-Policy: strict-origin-when-cross-origin`
   - `Permissions-Policy: geolocation=(self), camera=(self)`
   - `Strict-Transport-Security: max-age=31536000`
   - Enforced `Content-Security-Policy: frame-ancestors 'self'; base-uri 'self'`
2. The more restrictive JavaScript/resource CSP is initially issued under `Content-Security-Policy-Report-Only`. The SPA has inline bootstrap scripts and Google Maps; enabling `script-src` enforcement before identifying and resolving violations can break login, maps or other HRMS features. This stage is intentional and should **not** be described as a complete strict-script CSP rollout.
3. Removed wildcard `Access-Control-Allow-Origin: *` from static JSON responses, `/version.json`, and the public file streaming helper.
4. Replaced broad dynamic origin reflection (including arbitrary localhost ports and `capacitor://` schemes) with exact comparison to an explicit, validated allowlist. Unknown and `null` origins receive no CORS credential or authorization headers.
5. Added `Vary: Origin` on PHP responses to avoid mixing cached origin-specific responses.

## Configuration

- `FRONTEND_URL` can specify the trusted frontend **origin**, e.g. `https://hrms-qwv3.onrender.com`. Do not include a path. With HRMS frontend and API hosted on the same site, no CORS authorization is needed for normal same-origin requests.
- `CORS_ALLOWED_ORIGINS` is optional, a comma-separated list of *additional*, explicitly trusted browser origins, e.g. `http://localhost:5173,capacitor://localhost` for authorized development work. It defaults to empty; **do not enable localhost or arbitrary capacitor origins on a public production API unless required and explicitly approved**. Never use `*`.
- Docker entrypoint now carries `CORS_ALLOWED_ORIGINS` into the PHP environment when it is configured in Render.
- Render terminates HTTPS at its edge and serves this container over internal HTTP. Apache includes HSTS on every response. Browsers ignore HSTS received over ordinary HTTP, so local HTTP development remains unaffected; real HTTPS clients enforce it.

## Automated verification

GitHub Actions `.github/workflows/sec007.yml`:
- Lints the PHP middleware/helper and runs 15 exact-origin allow/deny cases.
- Starts the real Slim application with synthetic CORS environment settings and asserts allowed, denied, no-Origin and preflight response behavior.
- Boots the real `php:8.2-apache` server with the production `.htaccess` and verifies seven security headers on HTML and static JSON; confirms no static wildcard CORS.

## Live verification after merge/deploy

Run on the deployed HTTPS website (no login/JWT is required for these checks):

```powershell
$site = "https://hrms-qwv3.onrender.com"
curl.exe -sS -I "$site/"
curl.exe -sS -I "$site/manifest.json"
curl.exe -sS -D - -o NUL -H "Origin: https://attacker.example" "$site/version.json"
```

Verify the HTML and JSON responses include `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `Strict-Transport-Security`, and both CSP header variants. The untrusted-origin response must **not** include `Access-Control-Allow-Origin` or `Access-Control-Allow-Credentials`. Note that a same-origin request does not need `Access-Control-Allow-Origin`.

After deployment, perform real-user regression testing on:
- Admin/employee/candidate login, dashboard and report navigation.
- Google Maps, employee geolocation check-in/check-out and native Android tracker.
- Documents, download links, images, training videos and browser embedded previews.
- Vite/local development only if specifically allowed in Render's CORS origin configuration.

Review browser console `Content-Security-Policy-Report-Only` violations before incrementally replacing the inline scripts with CSP nonces/hashes and enabling enforced `script-src`. Do not prematurely switch to enforcing restrictive scripts.

## Independent findings

SEC-007 does **not** fix the original MFA/RBAC/IDOR findings or the frontend XSS sources. In particular, SEC-022 and SEC-024 remain independent issues. The presence of HTTP response headers alone does not prove full application security.
