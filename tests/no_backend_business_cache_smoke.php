<?php
declare(strict_types=1);

require_once __DIR__ . '/../backend/public/attendance_helpers.php';

final class FakeFreshStatement
{
    private $parent;
    public function __construct($parent) { $this->parent = $parent; }
    public function execute(array $params): void { $this->parent->requested[] = $params; }
    public function fetchColumn() { return $this->parent->nextWeekOff(); }
    public function fetchAll(int $mode): array {
        if ($mode !== PDO::FETCH_COLUMN) throw new RuntimeException('Unexpected fetch mode');
        return $this->parent->nextHolidaySet();
    }
}
final class FakeFreshConnection
{
    public array $requested = [];
    public int $holidayCalls = 0;
    public int $weekOffCalls = 0;
    public function query(string $sql): FakeFreshStatement {
        if (strpos($sql, 'company_holidays') === false) throw new RuntimeException('Wrong holiday query');
        return new FakeFreshStatement($this);
    }
    public function prepare(string $sql): FakeFreshStatement {
        if (strpos($sql, 'employee') === false) throw new RuntimeException('Wrong week-off query');
        return new FakeFreshStatement($this);
    }
    public function nextHolidaySet(): array {
        $this->holidayCalls++;
        return $this->holidayCalls === 1 ? ['2026-11-20'] : ['2026-11-21'];
    }
    public function nextWeekOff(): string {
        $this->weekOffCalls++;
        return $this->weekOffCalls === 1 ? 'sunday' : 'saturday';
    }
}

$conn = new FakeFreshConnection();
$firstHolidays = getActiveHolidaysMap($conn);
$secondHolidays = getActiveHolidaysMap($conn);
if ($firstHolidays === $secondHolidays || $conn->holidayCalls !== 2 ||
    !isset($firstHolidays['2026-11-20']) || !isset($secondHolidays['2026-11-21'])) {
    throw new RuntimeException('Holiday lookup reused stale records');
}

$firstWeekOff = getEmployeeWeekOffDays($conn, 'synthetic-employee');
$secondWeekOff = getEmployeeWeekOffDays($conn, 'synthetic-employee');
if ($firstWeekOff !== ['sunday'] || $secondWeekOff !== ['saturday'] ||
    $conn->weekOffCalls !== 2 || count($conn->requested) !== 2) {
    throw new RuntimeException('Week-off lookup reused stale records');
}
echo "Backend per-call fresh attendance lookups PASS\n";
