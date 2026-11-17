<?php
// SEC-001 focused security regression checks; never connects to production.
namespace App\Middleware {
    class AuthMiddleware { public function __construct(array $roles = []) {} }
}
namespace {
class MockRoute { public function add($middleware): self { return $this; } }
class MockApp {
    public function post(string $path, $handler): MockRoute { return new MockRoute(); }
    public function delete(string $path, $handler): MockRoute { return new MockRoute(); }
}
class MockStmt {
    public function __construct(private array $row) {}
    public function execute(array $params): void {}
    public function fetch($mode = null) { return $this->row ?: false; }
}
class MockDb {
    private int $idx = 0;
    public function __construct(private array $rows) {}
    public function prepare(string $sql): MockStmt {
        return new MockStmt($this->rows[$this->idx++] ?? []);
    }
}
function check001(bool $pass, string $name): void {
    if (!$pass) { fwrite(STDERR, "FAIL: $name\n"); exit(1); }
    echo "PASS: $name\n";
}
$app = new MockApp();
require dirname(__DIR__) . '/backend/public/storage_routes.php';
check001(sec001ValidPath('user123/id.pdf'), 'accept valid path');
foreach (['../x.pdf', '/abs.jpg', 'two//slashes.pdf', 'with spaces.png', 'a/../file', ''] as $path) {
    check001(!sec001ValidPath($path), "reject unsafe path");
}
check001(sec001Flag('t') && sec001Flag(true) && !sec001Flag('f') && !sec001Flag(false), 'parse postgres boolean strings');
$u = (object)['id' => 'user123', 'role' => 'candidate'];
check001(sec001Permission(new MockDb([]), $u, 'resumes', 'Resume-user123-001-file.pdf'), 'allow own candidate resume');
check001(!sec001Permission(new MockDb([]), $u, 'resumes', 'Resume-other-001-file.pdf'), 'reject cross-candidate resume');
check001(sec001Permission(new MockDb([]), $u, 'candidate_documents', 'user123/id.pdf'), 'allow own candidate doc');
check001(!sec001Permission(new MockDb([]), $u, 'candidate_documents', 'other/id.pdf'), 'reject cross-candidate doc');
check001(!sec001Permission(new MockDb([]), $u, 'loan_documents', 'APP1_photo.jpg'), 'deny candidate loans');
$employee = (object)['id'=>'emp-user', 'role'=>'employee'];
check001(!sec001Permission(new MockDb([
    ['employeeId'=>'E1','branch'=>'B1','can_loan'=>'f','can_branch'=>'f']
]),$employee,'loan_documents','APP1_photo.jpg'), 'deny false-string employee feature flags');
check001(!sec001Permission(new MockDb([
    ['employeeId'=>'E1','branch'=>'B1','can_loan'=>'f','can_branch'=>'t'],
    ['created_by'=>'another','branch'=>'B2']
]),$employee,'loan_documents','APP1_photo.jpg'), 'deny cross-branch loan upload');
check001(sec001Permission(new MockDb([
    ['employeeId'=>'E1','branch'=>'B1','can_loan'=>'f','can_branch'=>'t'],
    ['created_by'=>'another','branch'=>'B1']
]),$employee,'loan_documents','APP1_photo.jpg'), 'allow authorized branch loan upload');
check001(!sec001Permission(new MockDb([]), (object)['id'=>'a','role'=>'admin'],'unknown','file.pdf'), 'block unknown bucket');
$pdf = "%PDF-1.4\n1 0 obj <</Type/Catalog>> endobj\n%%EOF\n";
check001(sec001Mime('offer_letters','doc.pdf',$pdf) === 'application/pdf', 'accept PDF signature');
check001(sec001Mime('avatars','fake.jpg',$pdf) === null, 'reject disguised upload');
check001(sec001Mime('avatars','unsafe.svg','<svg></svg>') === null, 'reject SVG upload');
$sql = file_get_contents(dirname(__DIR__) . '/supabase/migrations/20261113_sec_001_lock_down_rls.sql');
check001(str_contains($sql, 'DROP POLICY IF EXISTS') && str_contains($sql, 'REVOKE ALL PRIVILEGES'), 'migration revokes permissive rules');
echo "Focused SEC-001 regression checks passed.\n";
}
