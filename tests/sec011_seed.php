<?php
declare(strict_types=1);

// Destructive fixtures are restricted to an isolated CI database.
if (($_ENV['DB_DATABASE'] ?? getenv('DB_DATABASE') ?: '') !== 'sec011_test') {
    fwrite(STDERR, "SEC-011 refused to seed outside sec011_test\n");
    exit(1);
}
$pdo = new PDO(
    'pgsql:host=' . (getenv('DB_HOST') ?: '127.0.0.1') . ';port=' .
    (getenv('DB_PORT') ?: '5432') . ';dbname=sec011_test',
    getenv('DB_USERNAME') ?: 'postgres',
    getenv('DB_PASSWORD') ?: ''
);
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$pdo->exec(<<<'SQL'
CREATE TABLE users (
 id UUID PRIMARY KEY, role TEXT NOT NULL, "isActive" BOOLEAN NOT NULL DEFAULT TRUE, token_version INTEGER NOT NULL DEFAULT 0,
 "firstName" TEXT, "lastName" TEXT, email TEXT
);
CREATE TABLE branches (id UUID PRIMARY KEY, name TEXT NOT NULL);
CREATE TABLE employee (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), "userId" UUID UNIQUE NOT NULL REFERENCES users(id),
 "employeeId" TEXT, "firstName" TEXT, "lastName" TEXT, email TEXT, department TEXT, position TEXT, branch TEXT
);
CREATE TABLE user_feature_access (
 "userId" UUID PRIMARY KEY REFERENCES users(id),
 "canLoanOrigination" BOOLEAN DEFAULT FALSE,
 "canSalesOrigination" BOOLEAN DEFAULT FALSE,
 "canBranchOperations" BOOLEAN DEFAULT FALSE
);
CREATE TABLE loan_leads (
 id UUID PRIMARY KEY, name TEXT, phone TEXT, address TEXT, loan_type TEXT,
 status TEXT, branch TEXT, created_by UUID REFERENCES users(id), created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE loan_applications (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 application_id TEXT UNIQUE,
 lead_id TEXT,
 loan_type TEXT,
 status TEXT,
 form_data JSONB NOT NULL DEFAULT '{}',
 signatures JSONB NOT NULL DEFAULT '{}',
 branch TEXT,
 created_by UUID REFERENCES users(id),
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE loan_documents (
 application_id TEXT, slot_key TEXT, url TEXT,
 created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW(),
 PRIMARY KEY (application_id, slot_key)
);
CREATE TABLE loan_application_audit_logs (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 application_id TEXT, loan_application_id UUID,
 editor_name TEXT, editor_user_id UUID, changes JSONB,
 changes_count INT, created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE portal_item_reads (
 user_id UUID, portal_key TEXT, item_type TEXT, item_id UUID,
 last_seen_at TIMESTAMPTZ, seen_at TIMESTAMPTZ,
 PRIMARY KEY(user_id,portal_key,item_type,item_id)
);
CREATE TABLE origination_activities (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 title TEXT, priority TEXT,
 start_date DATE, start_time TEXT, end_date DATE, end_time TEXT,
 all_day BOOLEAN DEFAULT FALSE, address TEXT, notes TEXT,
 status TEXT DEFAULT 'Scheduled',
 created_by UUID REFERENCES users(id), assigned_to UUID REFERENCES users(id),
 created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);
SQL);
$A = '00000000-0000-4000-8000-000000000001';
$B = '00000000-0000-4000-8000-000000000002';
$C = '00000000-0000-4000-8000-000000000003';
$D = '00000000-0000-4000-8000-000000000004';
$E = '00000000-0000-4000-8000-000000000005';
$ADMIN = '00000000-0000-4000-8000-000000000006';
$G = '00000000-0000-4000-8000-000000000007';
$H = '00000000-0000-4000-8000-000000000008';
$BRANCH_A = '10000000-0000-4000-8000-000000000001';
$BRANCH_B = '10000000-0000-4000-8000-000000000002';
$insertU=$pdo->prepare('INSERT INTO users (id, role,"firstName","lastName",email) VALUES (?,?,?,?,?)');
$insertE=$pdo->prepare('INSERT INTO employee ("userId","employeeId","firstName","lastName",email,department,position,branch) VALUES (?,?,?,?,?,?,?,?)');
$insertFA=$pdo->prepare('INSERT INTO user_feature_access ("userId","canLoanOrigination","canSalesOrigination","canBranchOperations") VALUES (?,?::boolean,?::boolean,?::boolean)');
foreach ([
 [$A,'employee','Loan','Alice',$BRANCH_A,1,0,0],
 [$B,'employee','Loan','Bob',$BRANCH_A,1,0,0],
 [$C,'employee','Loan','Carol',$BRANCH_B,1,0,0],
 [$D,'employee','Branch','Derek',$BRANCH_A,0,0,1],
 [$E,'employee','Branch','Emma',$BRANCH_B,0,0,1],
 [$ADMIN,'admin','Admin','Owner',null,0,0,0],
 [$G,'employee','Loan','Greg',$BRANCH_A,1,0,0],
 [$H,'employee','Orphan','Hugh',null,0,0,1]
] as [$id,$role,$first,$last,$branch,$loan,$sale,$branchOp]) {
 $insertU->execute([$id,$role,$first,$last,strtolower($first).'@example.invalid']);
 if ($role !== 'admin' && $id !== $H) {
   $insertE->execute([$id, 'EMP-'.$first, $first,$last,strtolower($first).'@example.invalid','Operations','Officer',$branch]);
 }
 $insertFA->execute([$id,$loan?'true':'false',$sale?'true':'false',$branchOp?'true':'false']);
}
$pdo->prepare('INSERT INTO branches (id,name) VALUES (?,?)')->execute([$BRANCH_A,'Branch A']);
$pdo->prepare('INSERT INTO branches (id,name) VALUES (?,?)')->execute([$BRANCH_B,'Branch B']);
$leads=$pdo->prepare('INSERT INTO loan_leads (id,name,phone,address,loan_type,status,branch,created_by) VALUES (?,?,?,?,?,?,?,?)');
foreach ([[$A,$BRANCH_A,'00000000-0000-4000-8000-00000000b001'],[$B,$BRANCH_A,'00000000-0000-4000-8000-00000000b002'],[$C,$BRANCH_B,'00000000-0000-4000-8000-00000000b003']] as [$owner,$branch,$id]){
 $leads->execute([$id,'Synthetic','0000000000','Example Street','Business Loan','New',$branch,$owner]);
}
$loans=$pdo->prepare('INSERT INTO loan_applications (id,application_id,lead_id,loan_type,status,form_data,branch,created_by) VALUES (?,?,?, ?,?,?::jsonb,?,?)');
foreach ([
 ['00000000-0000-4000-8000-00000000a001','LA-A1','00000000-0000-4000-8000-00000000b001','Draft',$A,$BRANCH_A],
 ['00000000-0000-4000-8000-00000000a002','LA-B1','00000000-0000-4000-8000-00000000b002','Draft',$B,$BRANCH_A],
 ['00000000-0000-4000-8000-00000000a003','LA-C1','00000000-0000-4000-8000-00000000b003','Draft',$C,$BRANCH_B],
 ['00000000-0000-4000-8000-00000000a004','LA-TRANSFERRED','00000000-0000-4000-8000-00000000b001','Draft',$A,$BRANCH_B],
 ['00000000-0000-4000-8000-00000000a005','LA-SHARED','00000000-0000-4000-8000-00000000b001','Under Review',$B,$BRANCH_A],
 ['00000000-0000-4000-8000-00000000a006','LA-BRANCH','00000000-0000-4000-8000-00000000b001','Under Review',$A,$BRANCH_A],
 ['00000000-0000-4000-8000-00000000a007','LA-PREBRANCH','00000000-0000-4000-8000-00000000b001','Created',$A,$BRANCH_A]
] as [$id,$app,$lead,$status,$creator,$branch]){
 $transferredToBranch = $app !== 'LA-PREBRANCH';
 $form=json_encode([
   'applicant_name'=>'Synthetic Test','phone_number'=>'0000000000',
   'stage'=>$transferredToBranch ? 'Branch Operations' : 'Loan Origination',
   'timeline'=>$transferredToBranch
      ? [['stage'=>'Branch Operations','timestamp'=>'2026-11-14T00:00:00Z']]
      : []
 ]);
 $loans->execute([$id,$app,$lead,'Business Loan',$status,$form,$branch,$creator]);
}
$docs=$pdo->prepare('INSERT INTO loan_documents (application_id, slot_key, url) VALUES (?,?,?)');
$docs->execute(['LA-A1','identity','https://example.invalid/document-a']);
$docs->execute(['LA-B1','identity','https://example.invalid/document-b']);
$docs->execute(['00000000-0000-4000-8000-00000000b001','shared-legacy','https://example.invalid/ambiguous-legacy']);
$acts=$pdo->prepare('INSERT INTO origination_activities (id,title,start_date,start_time,end_date,end_time,created_by,assigned_to) VALUES (?,?,?,?,?,?,?,?)');
$next=(new DateTimeImmutable('tomorrow'))->format('Y-m-d');
foreach ([
 ['00000000-0000-4000-8000-00000000c001','Activity A',$A,$A],
 ['00000000-0000-4000-8000-00000000c002','Activity B',$B,$B],
 ['00000000-0000-4000-8000-00000000c003','Activity C',$C,$C]
] as [$id,$title,$creator,$assigned]){
 $acts->execute([$id,$title,$next,'10:00',$next,'11:00',$creator,$assigned]);
}
echo "SEC-011 isolated branch/loan/activity test data seeded\n";
