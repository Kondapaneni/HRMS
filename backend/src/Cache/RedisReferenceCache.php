<?php
declare(strict_types=1);

namespace App\Cache;

/**
 * Narrow, opt-in Redis cache for pre-authorized, low-risk reference reads.
 *
 * No auth decisions, private HRMS records, documents, payroll, GPS, live
 * attendance or maintenance outcomes may enter this store. Call only AFTER
 * the existing server-side authorization middleware has approved the request.
 * PostgreSQL remains authoritative; network/cache failures fail open to DB,
 * but database and authorization errors must still propagate unchanged.
 */
final class RedisReferenceCache
{
    private ?object $client;
    private string $namespace;
    private int $hits = 0;
    private int $misses = 0;
    private int $bypasses = 0;

    public function __construct(?object $client = null, string $namespace = 'hrms:ref:v1')
    {
        $this->client = $client;
        $this->namespace = $namespace;
    }

    /** Read configuration without ever including secrets in logs or cache keys. */
    private static function env(string $name): string
    {
        return trim((string) ($_ENV[$name] ?? (getenv($name) ?: '')));
    }

    public static function fromEnvironment(): self
    {
        if (self::env('HRMS_REDIS_ENABLED') !== 'true'
            || !class_exists(\Redis::class)) {
            return new self();
        }

        $url = self::env('REDIS_URL');
        $parts = $url !== '' && strlen($url) <= 2048 ? parse_url($url) : false;
        if (!is_array($parts) || !isset($parts['host'])
            || !in_array($parts['scheme'] ?? '', ['redis', 'rediss'], true)
            || isset($parts['query']) || isset($parts['fragment'])) {
            return new self();
        }

        $port = (int) ($parts['port'] ?? 6379);
        $database = ltrim((string) ($parts['path'] ?? '/0'), '/');
        if ($port < 1 || $port > 65535 || !preg_match('/^(?:[0-9]|1[0-5])$/', $database)) {
            return new self();
        }

        $client = new \Redis();
        try {
            // Render's internal Key Value URL is network-private. External
            // rediss:// URLs are supported through TLS without certificate
            // verification being disabled.
            $host = (($parts['scheme'] === 'rediss') ? 'tls://' : '')
                . (string) $parts['host'];
            if (!$client->connect($host, $port, 0.2, null, 0, 0.2)) {
                return new self();
            }
            $password = isset($parts['pass']) ? rawurldecode($parts['pass']) : '';
            $username = isset($parts['user']) ? rawurldecode($parts['user']) : '';
            if ($password !== '') {
                $auth = $username !== ''
                    ? $client->auth([$username, $password])
                    : $client->auth($password);
                if (!$auth) {
                    return new self();
                }
            }
            if (!$client->select((int) $database)) {
                return new self();
            }
            return new self($client);
        } catch (\Throwable $error) {
            // Never log an exception message, as a driver may include the URL.
            return new self();
        }
    }

    /**
     * Only one audited family is allowed. A digest of verified identity scope
     * avoids exposing user IDs or any request parameters in the stored key.
     * @param list<string|int> $verifiedScope
     */
    private function key(string $family, array $verifiedScope): string
    {
        if ($family !== 'branches' || !$verifiedScope || count($verifiedScope) > 8) {
            throw new \InvalidArgumentException('Unreviewed Redis reference family or scope');
        }
        foreach ($verifiedScope as $part) {
            if ((!is_string($part) && !is_int($part)) || strlen((string)$part) > 128) {
                throw new \InvalidArgumentException('Invalid Redis identity scope');
            }
        }
        return $this->namespace . ':' . $family . ':'
            . hash('sha256', json_encode(array_values($verifiedScope), JSON_THROW_ON_ERROR));
    }

    /**
     * @template T of array
     * @param list<string|int> $verifiedScope
     * @param callable():T $loadFromDatabase
     * @return T
     */
    public function remember(string $family, array $verifiedScope, int $ttlSeconds, callable $loadFromDatabase): array
    {
        if ($ttlSeconds < 1 || $ttlSeconds > 300) {
            throw new \InvalidArgumentException('Redis reference TTL must be 1..300 seconds');
        }
        $key = $this->key($family, $verifiedScope);
        if ($this->client !== null) {
            try {
                $raw = $this->client->get($key);
                if (is_string($raw)) {
                    $entry = json_decode($raw, true);
                    if (is_array($entry) && ($entry['schema'] ?? null) === 1
                        && isset($entry['data']) && is_array($entry['data'])) {
                        ++$this->hits;
                        return $entry['data'];
                    }
                }
                ++$this->misses;
            } catch (\Throwable $ignored) {
                ++$this->bypasses;
                // Network/Redis failure cannot turn a working SQL read into a 500.
            }
        } else {
            ++$this->bypasses;
        }

        // Intentionally outside catch: PostgreSQL failures must not be
        // swallowed or converted to empty-success records.
        $data = $loadFromDatabase();
        if (!is_array($data)) {
            throw new \UnexpectedValueException('Expected reference rows from PostgreSQL');
        }

        if ($this->client !== null) {
            try {
                $packed = json_encode(['schema' => 1, 'data' => $data], JSON_THROW_ON_ERROR);
                // Exclude oversized or unexpected private data automatically.
                if (strlen($packed) <= 32768) {
                    // Bounded, slightly jittered expiration avoids a single
                    // simultaneous expiry wave without background polling.
                    $ttl = max(1, $ttlSeconds - random_int(0, min(5, $ttlSeconds - 1)));
                    $this->client->setEx($key, $ttl, $packed);
                }
            } catch (\Throwable $ignored) {
                ++$this->bypasses;
            }
        }
        return $data;
    }

    /** Invalidates one explicitly scoped reference after a successful write. */
    public function invalidate(string $family, array $verifiedScope): void
    {
        $key = $this->key($family, $verifiedScope);
        if ($this->client === null) {
            return;
        }
        try {
            $this->client->del($key);
        } catch (\Throwable $ignored) {
            ++$this->bypasses;
        }
    }

    /** Only counters; no account details, cached values, keys or credentials. */
    public function counters(): array
    {
        return [
            'hits' => $this->hits,
            'misses' => $this->misses,
            'fallbacks' => $this->bypasses,
        ];
    }
}
