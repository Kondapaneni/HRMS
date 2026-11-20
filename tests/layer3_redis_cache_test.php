<?php
declare(strict_types=1);

require_once __DIR__ . '/../backend/src/Cache/RedisReferenceCache.php';

use App\Cache\RedisReferenceCache;

function expect(bool $value, string $message): void {
    if (!$value) throw new RuntimeException($message);
}

final class FakeRedisReferenceStore
{
    public array $values = [];
    public array $expires = [];
    public bool $brokenRead = false;
    public bool $brokenWrite = false;

    public function get(string $key): string|false
    {
        if ($this->brokenRead) throw new RuntimeException('synthetic Redis outage');
        if (!isset($this->values[$key]) ||
            ($this->expires[$key] ?? 0) <= time()) return false;
        return $this->values[$key];
    }

    public function setEx(string $key, int $ttl, string $value): bool
    {
        if ($this->brokenWrite) throw new RuntimeException('synthetic write outage');
        $this->values[$key] = $value;
        $this->expires[$key] = time() + $ttl;
        return true;
    }

    public function del(string $key): int
    {
        unset($this->values[$key], $this->expires[$key]);
        return 1;
    }
}

function runSuite(object $redis): void
{
    $cache = new RedisReferenceCache($redis, 'hrms:ci:reference:v1');
    $alice = ['account-alice', 'employee', 'org-a', 'branch-a'];
    $bob = ['account-bob', 'employee', 'org-a', 'branch-b'];
    $calls = 0;
    $loadAlice = static function () use (&$calls): array {
        $calls++;
        return [['id' => 'a', 'name' => 'Synthetic branch']];
    };

    expect($cache->remember('branches', $alice, 45, $loadAlice)[0]['id'] === 'a',
        'First authorized reference request must read database');
    expect($calls === 1, 'Database must be read on cache miss');
    expect($cache->remember('branches', $alice, 45, $loadAlice)[0]['id'] === 'a',
        'Same identity must reuse safe cached reference');
    expect($calls === 1, 'Same scoped cache must skip the repeated SQL');
    $cache->remember('branches', $bob, 45, static function () use (&$calls): array {
        $calls++;
        return [['id' => 'b', 'name' => 'Bob-only synthetic branch']];
    });
    expect($calls === 2, 'Changing verified user/branch must force separate database read');

    $allKeys = array_keys($redis->values);
    foreach ($allKeys as $key) {
        expect(!str_contains($key, 'account-alice') && !str_contains($key, 'branch-a'),
            'A Redis key must not disclose identity or branch');
        expect(!str_contains($key, 'Authorization') && !str_contains($key, 'Bearer'),
            'No bearer credential can enter the key');
    }
    expect(count($allKeys) === 2, 'Account-scoped references must use unique keys');

    $cache->invalidate('branches', $alice);
    $cache->remember('branches', $alice, 45, $loadAlice);
    expect($calls === 3, 'Invalidation must refresh the next read from PostgreSQL');

    try {
        $cache->remember('payroll', $alice, 45, $loadAlice);
        throw new RuntimeException('Sensitive family was incorrectly accepted');
    } catch (InvalidArgumentException $expected) {}
    try {
        $cache->remember('branches', [], 45, $loadAlice);
        throw new RuntimeException('Empty verified identity incorrectly accepted');
    } catch (InvalidArgumentException $expected) {}
    foreach ([0, 301] as $badTtl) {
        try {
            $cache->remember('branches', $alice, $badTtl, $loadAlice);
            throw new RuntimeException('Out of policy TTL was accepted');
        } catch (InvalidArgumentException $expected) {}
    }

    // Corrupt/dangerous cached entries must be treated as misses.
    foreach ($redis->values as $key => $value) {
        $redis->values[$key] = '{"schema":2,"data":{"token":"synthetic"}}';
    }
    $cache->remember('branches', $alice, 45, $loadAlice);
    expect($calls === 4, 'Invalid cache schema cannot be served');

    $redis->brokenRead = true;
    $cache->remember('branches', $alice, 45, $loadAlice);
    expect($calls === 5, 'Redis read outage must safely fall back to database');
    $redis->brokenRead = false;
    $redis->brokenWrite = true;
    $cache->invalidate('branches', $alice);
    $cache->remember('branches', $alice, 45, $loadAlice);
    expect($calls === 6, 'Redis write outage must not discard valid SQL data');
    $redis->brokenWrite = false;

    $cache->invalidate('branches', $alice);
    try {
        $cache->remember('branches', $alice, 45,
            static function (): array { throw new RuntimeException('synthetic database failure'); });
        throw new RuntimeException('Database failure was swallowed');
    } catch (RuntimeException $error) {
        expect($error->getMessage() === 'synthetic database failure',
            'Database failures must propagate, never become empty success');
    }

    expect($cache->counters()['hits'] >= 1, 'Count genuine cache hits');
    expect($cache->counters()['misses'] >= 1, 'Count misses');
    expect($cache->counters()['fallbacks'] >= 2, 'Count outage fallbacks');
}

$fake = new FakeRedisReferenceStore();
runSuite($fake);

if (in_array('--real', $argv, true)) {
    expect(extension_loaded('redis'), 'Real integration needs phpredis');
    // Only use a disposable CI/local Redis instance: never production.
    $host = getenv('HRMS_REDIS_CI_HOST') ?: '127.0.0.1';
    $port = (int) (getenv('HRMS_REDIS_CI_PORT') ?: 6379);
    $redis = new Redis();
    expect($redis->connect($host, $port, 0.5), 'Disposable Redis connection failed');
    $cache = new RedisReferenceCache($redis, 'hrms:ci:' . bin2hex(random_bytes(8)));
    $calls = 0;
    for ($i = 0; $i < 2; $i++) {
        $rows = $cache->remember('branches', ['ci-a', 'admin'], 5,
            static function () use (&$calls): array {
                $calls++;
                return [['id' => 'synthetic', 'name' => 'No production data']];
            });
        expect($rows[0]['id'] === 'synthetic', 'Real Redis reference decode failed');
    }
    expect($calls === 1, 'Real Redis cache did not deduplicate SQL work');
    expect($cache->counters()['hits'] === 1, 'Real Redis cache hit was not observed');
    $cache->invalidate('branches', ['ci-a', 'admin']);
}
echo "PASS Layer 3 Redis: isolation, TTL, failure fallback, invalidation, metrics"
    . (in_array('--real', $argv, true) ? ', real ephemeral Redis' : ', fake store') . "\n";
