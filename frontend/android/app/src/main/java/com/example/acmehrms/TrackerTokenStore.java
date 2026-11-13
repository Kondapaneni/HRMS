package com.example.acmehrms;

import android.content.Context;
import android.content.SharedPreferences;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;

import java.nio.charset.StandardCharsets;
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
    private static final String LEGACY_KEY = "auth_token";
    private static final String KEY_ALIAS = "hrms_tracker_jwt_v1";
    private static final String CIPHER = "AES/GCM/NoPadding";

    private TrackerTokenStore() { }

    static void save(Context context, String token) throws Exception {
        if (token == null || token.isEmpty()) throw new IllegalArgumentException("Missing tracker credential");

        Cipher cipher = Cipher.getInstance(CIPHER);
        cipher.init(Cipher.ENCRYPT_MODE, key());
        byte[] iv = cipher.getIV();
        if (iv == null || iv.length != 12) throw new IllegalStateException("Invalid GCM nonce");

        String sealed = Base64.encodeToString(iv, Base64.NO_WRAP) + ":" +
                Base64.encodeToString(cipher.doFinal(token.getBytes(StandardCharsets.UTF_8)), Base64.NO_WRAP);

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
                String[] parts = ciphertext.split(":", -1);
                if (parts.length != 2) throw new IllegalArgumentException("Invalid encrypted credential");
                byte[] iv = Base64.decode(parts[0], Base64.NO_WRAP);
                if (iv.length != 12) throw new IllegalArgumentException("Invalid GCM nonce");
                byte[] encrypted = Base64.decode(parts[1], Base64.NO_WRAP);
                Cipher cipher = Cipher.getInstance(CIPHER);
                cipher.init(Cipher.DECRYPT_MODE, key(), new GCMParameterSpec(128, iv));
                return new String(cipher.doFinal(encrypted), StandardCharsets.UTF_8);
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
