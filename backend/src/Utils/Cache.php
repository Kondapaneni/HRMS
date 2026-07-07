<?php
namespace App\Utils;

class Cache {
    /**
     * Get a value from the cache.
     *
     * @param string $key
     * @return mixed|false Returns the value or false if not found/expired.
     */
    public static function get(string $key) {
        if (function_exists('apcu_fetch')) {
            return apcu_fetch($key);
        }
        return false;
    }

    /**
     * Set a value in the cache.
     *
     * @param string $key
     * @param mixed $value
     * @param int $ttl Time to live in seconds.
     * @return bool
     */
    public static function set(string $key, $value, int $ttl = 60): bool {
        if (function_exists('apcu_store')) {
            return apcu_store($key, $value, $ttl);
        }
        return false;
    }

    /**
     * Delete a value from the cache.
     *
     * @param string $key
     * @return bool
     */
    public static function delete(string $key): bool {
        if (function_exists('apcu_delete')) {
            return apcu_delete($key);
        }
        return false;
    }

    /**
     * Clear the entire cache.
     *
     * @return bool
     */
    public static function clear(): bool {
        if (function_exists('apcu_clear_cache')) {
            return apcu_clear_cache();
        }
        return false;
    }
}
