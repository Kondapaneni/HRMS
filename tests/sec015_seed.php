<?php
declare(strict_types=1);

// SEC-015 test data is disposable and MUST never be created in a live HRMS DB.
if ((getenv('DB_DATABASE') ?: '') !== 'sec015_test') {
    fwrite(STDERR, "Refusing to seed any DB other than sec015_test\n");
    exit(1);
}
$pdo = new PDO(
    sprintf('pgsql:host=%s;port=%s;dbname=sec015_test', getenv('DB_HOST') ?: '127.0.0.1', getenv('DB_PORT') ?: '5432'),
    getenv('DB_USERNAME') ?: 'postgres',
    getenv('DB_PASSWORD') ?: ''
);
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$pdo->exec(<<<'SQL'
CREATE TABLE global_settings (
 id integer primary key, maintenance_mode boolean not null default false,
 login_rate_limit_attempts integer default 5, login_rate_limit_window integer default 15,
 session_timeout text default 'never'
);
INSERT INTO global_settings (id) VALUES (1);
CREATE TABLE users (
 id uuid primary key default gen_random_uuid(), email text unique,
 password text, "firstName" text, "lastName" text, role text not null,
 department text, position text, "forcePasswordChange" boolean default false,
 reset_token text, reset_token_expires timestamp, "isActive" boolean default true,
 token_version integer default 0, "mfaEnabled" boolean default false
);
CREATE TABLE rate_limits (
 id bigserial primary key, ip_address text, action text,
 created_at timestamp default CURRENT_TIMESTAMP
);
CREATE TABLE jobs (id uuid primary key, title text not null, department text);
CREATE TABLE applications (
 id uuid primary key, job_id uuid, candidate_id uuid, status text,
 updated_at timestamp default CURRENT_TIMESTAMP
);
CREATE SCHEMA storage;
CREATE TABLE storage.objects (
 bucket_id text NOT NULL,
 name text NOT NULL,
 PRIMARY KEY (bucket_id, name)
);
CREATE TABLE branches (id uuid primary key, name text not null);
INSERT INTO branches (id, name) VALUES
('00000000-0000-4000-8000-00000000d501', 'Test Branch');
CREATE TABLE application_timeline (
 id uuid primary key default gen_random_uuid(), application_id uuid,
 status_change text, notes text, created_at timestamp default CURRENT_TIMESTAMP
);
CREATE TABLE candidate_documents (
 id uuid primary key default gen_random_uuid(),
 candidate_id uuid, document_type text, status text
);
CREATE TABLE employee (
 id uuid primary key default gen_random_uuid(), "employeeId" text NOT NULL UNIQUE,
 "userId" uuid, "firstName" text, "lastName" text, email text, phone text,
 department text, position text, branch text, "joinDate" date,
 salary numeric, status text, "managerId" uuid, timeline text
);
CREATE TABLE email_queue (
 id uuid primary key default gen_random_uuid(),
 to_email text, subject text, body text, status text default 'pending',
 delivery_token uuid default gen_random_uuid()
);
SQL);

$admin='00000000-0000-4000-8000-00000000e501';
$names=[
 ['00000000-0000-4000-8000-00000000e502','Candidate','<img src=x onerror=alert(1)>','candidate-a@example.invalid'],
 ['00000000-0000-4000-8000-00000000e503','Rejected','Candidate','candidate-b@example.invalid'],
 ['00000000-0000-4000-8000-00000000e504','Verified','Candidate','candidate-c@example.invalid'],
 ['00000000-0000-4000-8000-00000000e505','Missing','Documents','candidate-d@example.invalid'],
];
$ins=$pdo->prepare('INSERT INTO users (id,email,"firstName","lastName",role,password) VALUES (?,?,?,?,?,?)');
$ins->execute([$admin,'admin@example.invalid','Admin','Tester','admin',password_hash('not-for-login',PASSWORD_DEFAULT)]);
foreach ($names as [$id,$first,$last,$email]) {
    $ins->execute([$id,$email,$first,$last,'candidate',password_hash('not-for-login',PASSWORD_DEFAULT)]);
}
$jobId='00000000-0000-4000-8000-00000000a501';
$pdo->prepare('INSERT INTO jobs (id,title) VALUES (?,?)')->execute([$jobId, '<a href="https://malicious.invalid">Engineer</a>']);
$insApp=$pdo->prepare('INSERT INTO applications (id,job_id,candidate_id,status) VALUES (?,?,?,?)');
foreach ([
    ['00000000-0000-4000-8000-00000000b501',$names[0][0],'Shortlisted'],
    ['00000000-0000-4000-8000-00000000b502',$names[1][0],'Rejected'],
    ['00000000-0000-4000-8000-00000000b503',$names[2][0],'Hired'],
    ['00000000-0000-4000-8000-00000000b504',$names[3][0],'Hired'],
] as [$id,$candidate,$status]) {
    $insApp->execute([$id,$jobId,$candidate,$status]);
}
$required=['signed_offer_letter','aadhaar_pan','photo','community_certificate',
 'academic_certificates','police_verification','family_aadhaar_pan',
 'nominee_esi','bank_cheques','fitness_certificate'];
$insDoc=$pdo->prepare("INSERT INTO candidate_documents (candidate_id,document_type,status) VALUES (?,?,'verified')");
foreach ($required as $type) $insDoc->execute([$names[2][0],$type]);
$oldUser='00000000-0000-4000-8000-00000000e506';
$oldEmployee='00000000-0000-4000-8000-00000000c501';
$ins->execute([$oldUser,'employee-old@example.invalid','<svg onload=alert(1)>','Employee','employee',password_hash('not-for-login',PASSWORD_DEFAULT)]);
$pdo->prepare('INSERT INTO employee (id,"userId","employeeId","firstName","lastName",email,position,salary,status,timeline) VALUES (?,?,?,?,?,?,?,? ,?,?)')
  ->execute([$oldEmployee,$oldUser,'SEC015-OLD','<svg onload=alert(1)>','Employee','employee-old@example.invalid','Analyst',15000,'active','[]']);
echo "SEC-015 isolated HRMS mail fixtures seeded; no live accounts or outbound email\n";
