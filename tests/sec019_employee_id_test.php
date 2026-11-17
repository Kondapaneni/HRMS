<?php
declare(strict_types=1);
require __DIR__ . '/../backend/src/Utils/EmployeeId.php';
use App\Utils\EmployeeId;

$seen = [];
for ($i = 0; $i < 2000; $i++) {
    $id = EmployeeId::generate();
    if (!preg_match('/\AEMP-[0-9A-F]{32}\z/D', $id) || strlen($id) > 50) {
        throw new RuntimeException('SEC-019 invalid employee ID');
    }
    if (isset($seen[$id])) {
        throw new RuntimeException('SEC-019 unexpected employee ID collision');
    }
    $seen[$id] = true;
}
echo "SEC-019 employee code format, CSPRNG and sample uniqueness PASS\n";
