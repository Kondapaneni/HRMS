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
// CSPRNG-generated object paths must retain ownership prefixes and extensions.
$firstPath = sec017GeneratedPath('candidate-user123-sec017.png');
$secondPath = sec017GeneratedPath('candidate-user123-sec017.png');
check001(is_string($firstPath) &&
    preg_match('/^candidate-user123-sec017-[a-f0-9]{32}\\.png$/', $firstPath) === 1,
    'server mints a 128-bit random suffix');
check001($firstPath !== $secondPath, 'separate uploads never reuse client filename');
check001(sec001ValidPath($firstPath), 'generated filename preserves safe path rules');
check001(sec017GeneratedPath('user123/id.pdf') !== null, 'nested ownership path retained');
check001(sec017GeneratedPath(str_repeat('a', 225) . '.pdf') === null,
    'reject names too long after random suffix');
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
$avifHeader = "\x00\x00\x00\x18ftypavif\x00\x00\x00\x00avifmif1";
check001(sec001Mime('avatars', 'historic.avif', $avifHeader) === 'image/avif',
    'accept AVIF image signature for historical format compatibility');
check001(sec001Mime('avatars', 'spoofed.avif', '<svg onload="x"/>') === null,
    'reject fake AVIF with SVG content');
check001(sec001Mime('avatars','fake.jpg',$pdf) === null, 'reject disguised upload');
check001(sec001Mime('avatars','unsafe.svg','<svg></svg>') === null, 'reject SVG upload');
$sql = file_get_contents(dirname(__DIR__) . '/supabase/migrations/20261113_sec_001_lock_down_rls.sql');
check001(str_contains($sql, 'DROP POLICY IF EXISTS') && str_contains($sql, 'REVOKE ALL PRIVILEGES'), 'migration revokes permissive rules');
echo "Focused SEC-001 regression checks passed.\n";
}
