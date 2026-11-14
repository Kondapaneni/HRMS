<?php
declare(strict_types=1);

// SEC-009: seed a disposable local PostgreSQL test database ONLY.
if (($_ENV['DB_DATABASE'] ?? getenv('DB_DATABASE') ?: '') !== 'sec009_test') {
    fwrite(STDERR, "SEC-009 refused non-test database\n");
    exit(1);
}
$pdo = new PDO(
    'pgsql:host=' . ($_ENV['DB_HOST'] ?? getenv('DB_HOST') ?: '127.0.0.1')
      . ';port=' . ($_ENV['DB_PORT'] ?? getenv('DB_PORT') ?: '5432')
      . ';dbname=sec009_test',
    $_ENV['DB_USERNAME'] ?? getenv('DB_USERNAME') ?: 'postgres',
    $_ENV['DB_PASSWORD'] ?? getenv('DB_PASSWORD') ?: ''
);
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$pdo->exec(<<<'SQL'
CREATE TABLE users (
  id TEXT PRIMARY KEY, role TEXT NOT NULL, "isActive" BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE TABLE user_feature_access (
  "userId" TEXT PRIMARY KEY,
  "canLoanOrigination" BOOLEAN NOT NULL DEFAULT FALSE,
  "canSalesOrigination" BOOLEAN NOT NULL DEFAULT FALSE,
  "canBranchOperations" BOOLEAN NOT NULL DEFAULT FALSE
);
-- SEC-020: mirror the live settings column used by the maintenance guard.
CREATE TABLE global_settings (
  id INTEGER PRIMARY KEY,
  maintenance_mode BOOLEAN NOT NULL DEFAULT FALSE
);
INSERT INTO global_settings (id, maintenance_mode) VALUES (1, FALSE);
SQL);

$rows = [
  ['sec009-admin',     'admin',     0, 0, 0],
  ['sec009-candidate', 'candidate', 1, 1, 1],
  ['sec009-employee',  'employee',  0, 0, 0],
  ['sec009-loans',     'employee',  1, 0, 0],
  ['sec009-sales',     'employee',  0, 1, 0],
  ['sec009-branch',    'employee',  0, 0, 1],
  ['sec009-hr',        'hr',        1, 0, 0],
  ['sec009-manager',   'manager',   0, 0, 1],
  ['sec009-disabled',  'employee',  1, 1, 1],
];
$u=$pdo->prepare('INSERT INTO users (id, role, "isActive") VALUES (?, ?, ?::boolean)');
$f=$pdo->prepare('INSERT INTO user_feature_access ("userId", "canLoanOrigination", "canSalesOrigination", "canBranchOperations") VALUES (?, ?::boolean, ?::boolean, ?::boolean)');
foreach($rows as [$id,$role,$loan,$sales,$branch]){
  $u->execute([$id,$role,$id !== 'sec009-disabled' ? 'true' : 'false']);
  $f->execute([$id,$loan ? 'true':'false',$sales ? 'true':'false',$branch ? 'true':'false']);
}
echo "SEC-009 synthetic isolated database seeded\n";
