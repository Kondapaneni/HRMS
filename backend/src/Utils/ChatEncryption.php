<?php

namespace App\Utils;

class ChatEncryption
{
    private static function getKey(): string
    {
        $hexKey = $_ENV['APP_CHAT_KEY'] ?? '';
        if (empty($hexKey) || strlen($hexKey) !== 64) {
            // Fallback or throw error. We'll throw an error for missing key
            throw new \Exception('APP_CHAT_KEY environment variable is not set correctly (must be 64 hex chars).');
        }
        return hex2bin($hexKey);
    }

    public static function encrypt(string $plaintext): string
    {
        $key = self::getKey();
        $iv = random_bytes(12);
        $tag = '';
        
        $ciphertext = openssl_encrypt(
            $plaintext, 
            'aes-256-gcm', 
            $key, 
            OPENSSL_RAW_DATA, 
            $iv, 
            $tag
        );

        if ($ciphertext === false) {
            throw new \Exception('Encryption failed.');
        }

        // Payload format: Base64 of (IV + Tag + Ciphertext)
        return base64_encode($iv . $tag . $ciphertext);
    }

    public static function decrypt(string $payload): string
    {
        $decoded = base64_decode($payload, true);
        
        // If it's not base64 or too short (needs at least 12 IV + 16 Tag = 28 bytes)
        if ($decoded === false || strlen($decoded) < 28) {
            return $payload; // Return original (legacy plaintext)
        }

        $key = self::getKey();
        $iv = substr($decoded, 0, 12);
        $tag = substr($decoded, 12, 16);
        $ciphertext = substr($decoded, 28);

        try {
            $plaintext = openssl_decrypt(
                $ciphertext, 
                'aes-256-gcm', 
                $key, 
                OPENSSL_RAW_DATA, 
                $iv, 
                $tag
            );

            if ($plaintext === false) {
                return '[Message unavailable]';
            }

            return $plaintext;
        } catch (\Exception $e) {
            return '[Message unavailable]';
        }
    }
}
