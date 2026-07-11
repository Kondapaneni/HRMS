<?php
namespace App\Utils;

class PasswordValidator {
    public static function validate(string $password): bool {
        if (strlen($password) < 8) return false;
        if (!preg_match('/[A-Z]/', $password)) return false;
        if (!preg_match('/[a-z]/', $password)) return false;
        if (!preg_match('/[0-9]/', $password)) return false;
        if (!preg_match('/[^A-Za-z0-9]/', $password)) return false;
        return true;
    }

    public static function getPolicyMessage(): string {
        return 'Password must be at least 8 characters long, and contain at least one uppercase letter, one lowercase letter, one number, and one special character.';
    }
}
