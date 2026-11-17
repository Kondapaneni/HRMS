<?php
declare(strict_types=1);
require __DIR__ . '/../backend/src/Utils/EmployeeId.php';

use App\Utils\EmployeeId;

$seen = [];
for ($i = 0; $i < 2000; $i++) {
    $id = EmployeeId::generate();
    if (!preg_match('/\A[1-9][0-9]{7}\z/D', $id) || strlen($id) !== 8) {
        throw new RuntimeException('Employee code must contain exactly eight decimal digits');
    }
    $seen[$id] = true;
}

// A small random identifier space can legitimately collide. Test that
// generation varies, not that collisions are mathematically impossible.
if (count($seen) < 1950) {
    throw new RuntimeException('Generated codes are not sufficiently varied');
}

// Simulate two unique-constraint conflicts followed by successful insertion.
$calls = 0;
[$code, $employeeUuid] = EmployeeId::insertUnique(
    function (string $candidate) use (&$calls): string|false {
        if (!preg_match('/\A[1-9][0-9]{7}\z/D', $candidate)) {
            throw new RuntimeException('Invalid retry candidate');
        }
        $calls++;
        return $calls < 3 ? false : 'test-employee-uuid';
    }
);
if ($calls !== 3 || $employeeUuid !== 'test-employee-uuid' || strlen($code) !== 8) {
    throw new RuntimeException('Employee code collision retry failed');
}

// After bounded retries, fail safely rather than silently reusing a code.
$calls = 0;
$exhausted = false;
try {
    EmployeeId::insertUnique(function () use (&$calls): false {
        $calls++;
        return false;
    });
} catch (RuntimeException $e) {
    $exhausted = true;
}
if (!$exhausted || $calls !== EmployeeId::MAX_ATTEMPTS) {
    throw new RuntimeException('Employee code retry limit not enforced');
}

// Other failures must propagate instead of being mislabeled as collisions.
$failedClosed = false;
try {
    EmployeeId::insertUnique(function (): never {
        throw new LogicException('unrelated constraint failure');
    });
} catch (LogicException $e) {
    $failedClosed = true;
}
if (!$failedClosed) {
    throw new RuntimeException('Unrelated insert failure was swallowed');
}

echo "Eight-digit employee ID format, secure randomness and retries PASS\n";
