package com.example.acmehrms;

import android.content.Context;
import android.content.SharedPreferences;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;

import java.nio.charset.StandardCharsets;
import java.net.URI;
import java.security.KeyStore;

import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

/**
 * SEC-006: encrypt the native tracker JWT with a non-exportable AndroidKeyStore
 * AES-GCM key. Only opaque ciphertext/nonce are stored in SharedPreferences.
 * This protects the native service's persisted credential; WebView localStorage
 * has separate handling under SEC-021.
 */
final class TrackerTokenStore {
    private static final String PREFS = "hrms_tracker_prefs";
    private static final String SECURE_KEY = "auth_token_secure_v1";
    private static final String REFRESH_KEY = "refresh_token_secure_v1";
    private static final String LEGACY_KEY = "auth_token";
    private static final String KEY_ALIAS = "hrms_tracker_jwt_v1";
    private static final String CIPHER = "AES/GCM/NoPadding";

    private TrackerTokenStore() { }

    /**
     * The shipped native tracker must send bearer tokens only to the
     * designated HTTPS HRMS endpoint. No caller-provided HTTP/foreign URLs.
     */
    static boolean trustedEndpoint(String candidate) {
        try {
            URI uri = new URI(candidate);
            return "https".equalsIgnoreCase(uri.getScheme())
                    && "hrms-qwv3.onrender.com".equalsIgnoreCase(uri.getHost())
                    && (uri.getPort() == -1 || uri.getPort() == 443)
                    && "/api/employee/attendance/punch".equals(uri.getPath())
                    && uri.getRawQuery() == null
                    && uri.getRawFragment() == null
                    && uri.getUserInfo() == null;
        } catch (Exception ignored) {
            return false;
        }
    }


    /**
     * Store a newly signed access JWT and one-use refresh credential together.
     * Both secrets are AES-GCM sealed under AndroidKeyStore before persisting.
     */
    static synchronized void saveSession(Context context, String access, String refresh) throws Exception {
        if (access == null || access.isEmpty() || refresh == null
                || !refresh.matches("[0-9a-f-]{36}\\.[0-9a-f]{64}")) {
            throw new IllegalArgumentException("Missing or malformed native session");
        }
        String encryptedAccess = encrypt(access);
        String encryptedRefresh = encrypt(refresh);
        if (!context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
                .putString(SECURE_KEY, encryptedAccess)
                .putString(REFRESH_KEY, encryptedRefresh)
                .remove(LEGACY_KEY)
                .commit()) {
            throw new IllegalStateException("Could not persist encrypted native session");
        }
    }

    static synchronized String loadRefresh(Context context) {
        String sealed = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .getString(REFRESH_KEY, null);
        if (sealed == null) return null;
        try {
            return decrypt(sealed);
        } catch (Exception failure) {
            clearSession(context);
            return null;
        }
    }

    static synchronized void clearSession(Context context) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .edit().remove(SECURE_KEY).remove(LEGACY_KEY).remove(REFRESH_KEY).commit();
    }

    private static String encrypt(String token) throws Exception {
        Cipher cipher = Cipher.getInstance(CIPHER);
        cipher.init(Cipher.ENCRYPT_MODE, key());
        byte[] iv = cipher.getIV();
        if (iv == null || iv.length != 12) throw new IllegalStateException("Invalid GCM nonce");
        return Base64.encodeToString(iv, Base64.NO_WRAP) + ":" +
                Base64.encodeToString(cipher.doFinal(token.getBytes(StandardCharsets.UTF_8)), Base64.NO_WRAP);
    }

    private static String decrypt(String ciphertext) throws Exception {
        String[] parts = ciphertext.split(":", -1);
        if (parts.length != 2) throw new IllegalArgumentException("Invalid encrypted credential");
        byte[] iv = Base64.decode(parts[0], Base64.NO_WRAP);
        if (iv.length != 12) throw new IllegalArgumentException("Invalid GCM nonce");
        Cipher cipher = Cipher.getInstance(CIPHER);
        cipher.init(Cipher.DECRYPT_MODE, key(), new GCMParameterSpec(128, iv));
        return new String(cipher.doFinal(Base64.decode(parts[1], Base64.NO_WRAP)), StandardCharsets.UTF_8);
    }

    static void save(Context context, String token) throws Exception {
        if (token == null || token.isEmpty()) throw new IllegalArgumentException("Missing tracker credential");

        String sealed = encrypt(token);

        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        if (!prefs.edit().putString(SECURE_KEY, sealed).remove(LEGACY_KEY).commit()) {
            throw new IllegalStateException("Unable to persist encrypted tracker credential");
        }
    }

    static String load(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        try {
            String ciphertext = prefs.getString(SECURE_KEY, null);
            if (ciphertext != null) {
                return decrypt(ciphertext);
            }

            // One-time migration from an older app version. Never leave the
            // plaintext credential behind after a successful upgrade.
            String legacy = prefs.getString(LEGACY_KEY, null);
            if (legacy == null || legacy.isEmpty()) return null;
            save(context, legacy);
            return legacy;
        } catch (Exception ignored) {
            // A lost KeyStore key or corrupted state must never downgrade
            // security to plaintext storage or silently resume tracking.
            clear(context);
            return null;
        }
    }

    static void clear(Context context) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .edit().remove(SECURE_KEY).remove(LEGACY_KEY).apply();
    }

    private static SecretKey key() throws Exception {
        KeyStore store = KeyStore.getInstance("AndroidKeyStore");
        store.load(null);

        if (store.containsAlias(KEY_ALIAS)) {
            return (SecretKey) store.getKey(KEY_ALIAS, null);
        }

        KeyGenerator generator = KeyGenerator.getInstance(
                KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore");
        generator.init(new KeyGenParameterSpec.Builder(
                KEY_ALIAS, KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setRandomizedEncryptionRequired(true)
                .build());
        return generator.generateKey();
    }
}
