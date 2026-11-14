package com.example.acmehrms;

import android.content.Context;
import android.util.Base64;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

/**
 * SEC-012: one synchronized refresh path for native WebView and background
 * foreground-service punch calls. Neither side can race the other's one-use
 * refresh credential. Never log or expose refresh tokens to the WebView.
 */
final class NativeSessionClient {
    private static final String REFRESH_URL =
            "https://hrms-qwv3.onrender.com/api/auth/refresh";

    static final class InvalidSession extends IOException {
        InvalidSession(String reason) { super(reason); }
    }

    private NativeSessionClient() { }

    private static boolean tokenUsable(String token) {
        if (token == null) return false;
        try {
            String[] parts = token.split("\\.", -1);
            if (parts.length != 3) return false;
            byte[] json = Base64.decode(parts[1], Base64.URL_SAFE | Base64.NO_WRAP | Base64.NO_PADDING);
            long expiration = new JSONObject(new String(json, StandardCharsets.UTF_8)).getLong("exp");
            // Read unverified JWT only as a time hint. The PHP middleware makes
            // the definitive signature, DB-version and permission checks.
            return expiration > (System.currentTimeMillis() / 1000L) + 120;
        } catch (Exception ignored) {
            return false;
        }
    }

    static synchronized String accessOrRefresh(Context context) throws IOException {
        String current = TrackerTokenStore.load(context);
        if (tokenUsable(current)) return current;
        return refresh(context);
    }

    static synchronized String refresh(Context context) throws IOException {
        String secret = TrackerTokenStore.loadRefresh(context);
        if (secret == null || secret.isEmpty()) {
            throw new InvalidSession("Secure refresh session is missing. Please sign in again.");
        }

        HttpURLConnection conn = null;
        try {
            URL target = new URL(REFRESH_URL);
            if (!"https".equalsIgnoreCase(target.getProtocol())
                    || !"hrms-qwv3.onrender.com".equalsIgnoreCase(target.getHost())
                    || target.getPort() != -1
                    || !"/api/auth/refresh".equals(target.getPath())) {
                throw new IOException("Untrusted refresh endpoint");
            }
            conn = (HttpURLConnection) target.openConnection();
            conn.setInstanceFollowRedirects(false);
            conn.setRequestMethod("POST");
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setRequestProperty("X-HRMS-Client", "android");
            conn.setRequestProperty("X-HRMS-Refresh", "1");
            conn.setRequestProperty("Cache-Control", "no-store");
            conn.setDoOutput(true);
            conn.setConnectTimeout(15000);
            conn.setReadTimeout(15000);

            byte[] body = new JSONObject().put("refreshToken", secret)
                    .toString().getBytes(StandardCharsets.UTF_8);
            try (OutputStream os = conn.getOutputStream()) {
                os.write(body);
            }

            int code = conn.getResponseCode();
            if (code == 401 || code == 403) {
                TrackerTokenStore.clearSession(context);
                throw new InvalidSession("Secure session expired or revoked. Sign in again.");
            }
            if (code != 200) {
                throw new IOException("Session refresh unavailable: HTTP " + code);
            }

            StringBuilder response = new StringBuilder();
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(
                    conn.getInputStream(), StandardCharsets.UTF_8))) {
                String line;
                while ((line = reader.readLine()) != null) response.append(line);
            }
            JSONObject payload = new JSONObject(response.toString());
            String access = payload.getString("token");
            String nextRefresh = payload.getString("refreshToken");
            if (!access.matches("[A-Za-z0-9._-]+")
                    || !nextRefresh.matches("[0-9a-f-]{36}\\.[0-9a-f]{64}")) {
                throw new IOException("Invalid refreshed session response");
            }
            TrackerTokenStore.saveSession(context, access, nextRefresh);
            return access;
        } catch (InvalidSession failure) {
            throw failure;
        } catch (IOException failure) {
            throw failure;
        } catch (Exception failure) {
            // Network and Keystore errors are retryable. Never downgrade a
            // refresh token to unencrypted SharedPreferences or log the token.
            throw new IOException("Secure session refresh could not complete", failure);
        } finally {
            if (conn != null) conn.disconnect();
        }
    }
}
