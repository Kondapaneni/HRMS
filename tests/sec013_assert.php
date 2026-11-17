<?php
declare(strict_types=1);
if ((getenv('DB_DATABASE') ?: '') !== 'sec013_test') {
    fwrite(STDERR, "Refusing to assert outside isolated sec013_test\n"); exit(1);
}
$db = new PDO(
  sprintf('pgsql:host=%s;port=%s;dbname=sec013_test', getenv('DB_HOST') ?: '127.0.0.1', getenv('DB_PORT') ?: '5432'),
  getenv('DB_USERNAME') ?: 'postgres', getenv('DB_PASSWORD') ?: ''
);
$db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$employee='00000000-0000-4000-8000-000000000018';
$s=$db->prepare('SELECT salary FROM employee WHERE id=?'); $s->execute([$employee]);
if ((int)$s->fetchColumn() !== 125000) { throw new RuntimeException('Unauthorized salary modification persisted'); }
foreach ([
 '00000000-0000-4000-8000-0000000000c2',
 '00000000-0000-4000-8000-0000000000c3',
] as $id) {
    $stmt=$db->prepare('SELECT status, answers_data FROM assessment_attempts WHERE id=?');
    $stmt->execute([$id]);$row=$stmt->fetch(PDO::FETCH_ASSOC);
    if (($row['status'] ?? '') !== 'in_progress' || json_decode($row['answers_data'] ?? 'null', true) !== []) {
        throw new RuntimeException('Expired or revoked attempt was modified');
    }
}
$alice='00000000-0000-4000-8000-000000000011';
$stmt=$db->prepare("SELECT COUNT(*) FROM assessment_attempts WHERE employee_id=? AND status='graded'");
$stmt->execute([$alice]);
if ((int)$stmt->fetchColumn() !== 1) throw new RuntimeException('Fresh valid attempt did not grade exactly once');
echo "SEC-013 isolated DB postconditions PASSED\n";
