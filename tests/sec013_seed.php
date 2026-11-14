<?php
declare(strict_types=1);

// SEC-013 fixtures MUST NOT touch the connected HRMS database.
if ((getenv('DB_DATABASE') ?: '') !== 'sec013_test') {
    fwrite(STDERR, "Refusing to seed outside the isolated sec013_test database\n");
    exit(1);
}
$pdo = new PDO(
    sprintf('pgsql:host=%s;port=%s;dbname=sec013_test', getenv('DB_HOST') ?: '127.0.0.1', getenv('DB_PORT') ?: '5432'),
    getenv('DB_USERNAME') ?: 'postgres', getenv('DB_PASSWORD') ?: ''
);
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$pdo->exec(<<<'SQL'
CREATE TABLE global_settings (id integer primary key, maintenance_mode boolean not null default false);
INSERT INTO global_settings VALUES (1, false);
CREATE TABLE users (
 id uuid primary key, role text not null, "isActive" boolean default true,
 token_version integer default 0,
 "firstName" text, "lastName" text, email text, department text, position text,
 "mfaEnabled" boolean default false
);
CREATE TABLE user_feature_access (
 "userId" uuid primary key,
 "canAssets" boolean default false,
 "canEmployees" boolean default false,
 "canPayroll" boolean default false
);
CREATE TABLE branches (id uuid primary key, name text);
CREATE TABLE employee (
 id uuid primary key, "userId" uuid, "employeeId" text, "firstName" text,
 "lastName" text, email text, department text, position text,
 branch text, "joinDate" date, salary numeric, status text,
 avatar text, "managerId" uuid, timeline text
);
CREATE TABLE leaves (
 "employeeId" uuid, "leaveType" text, status text, days integer, "startDate" date
);
CREATE TABLE leave_balances ("employeeId" uuid, "paidTotal" integer);
CREATE TABLE payslips (
 id uuid, "employeeId" uuid, year integer, month integer,
 "netSalary" numeric, status text, "detailsJson" jsonb,
 "earningsJson" jsonb, "deductionsJson" jsonb, "createdAt" timestamptz
);
CREATE TABLE assets (name text, serial_number text, status text,
 created_at timestamptz, assigned_to uuid);
CREATE TABLE assessments (
 id uuid primary key, title text, department text,
 duration_minutes integer, passing_percentage integer,
 max_attempts integer, marks_per_question integer,
 randomize_questions boolean, randomize_options boolean,
 result_visibility text, assessment_date text,
 selected_questions jsonb, assigned_employee_ids jsonb,
 status text, questions_count integer default 1, created_at timestamptz default now()
);
CREATE TABLE assessment_attempts (
 id uuid primary key default gen_random_uuid(),
 assessment_id uuid, employee_id uuid,
 attempt_number integer, start_time timestamptz default CURRENT_TIMESTAMP,
 end_time timestamptz, updated_at timestamptz,
 status text, answers_data jsonb default '{}'::jsonb,
 score integer, total_marks integer, percentage numeric,
 passed boolean, submit_reason text
);
CREATE TABLE department_question_bank (
 id uuid primary key, question_text text, question_type text,
 options jsonb, correct_options jsonb, correct_option integer
);
CREATE TABLE email_queue (to_email text, subject text, body text);
SQL);
$alice='00000000-0000-4000-8000-000000000011';
$bob='00000000-0000-4000-8000-000000000012';
$asset='00000000-0000-4000-8000-000000000013';
$roster='00000000-0000-4000-8000-000000000014';
$payroll='00000000-0000-4000-8000-000000000015';
$admin='00000000-0000-4000-8000-000000000016';
$branch='00000000-0000-4000-8000-000000000017';
$emp='00000000-0000-4000-8000-000000000018';
$pdo->prepare('INSERT INTO branches VALUES (?,?)')->execute([$branch,'Synthetic Branch']);
$insertUser=$pdo->prepare('INSERT INTO users (id,role,"firstName","lastName",email,department) VALUES (?,?,?,?,?,?)');
$insertPerm=$pdo->prepare('INSERT INTO user_feature_access ("userId","canAssets","canEmployees","canPayroll") VALUES (?,?,?,?)');
foreach ([
 [$alice,'employee','Alice',false,false,false],
 [$bob,'employee','Bob',false,false,false],
 [$asset,'employee','Asset',true,false,false],
 [$roster,'employee','Roster',false,true,false],
 [$payroll,'hr','Payroll',false,true,true],
 [$admin,'admin','Admin',false,false,false],
] as [$id,$role,$name,$assets,$employees,$pay]){
    $insertUser->execute([$id,$role,$name,'Synthetic',strtolower($name).'@example.invalid','Training']);
    $insertPerm->execute([$id,$assets ? 'true':'false',$employees ? 'true':'false',$pay ? 'true':'false']);
}
$timeline=json_encode([
 ['title'=>'Joined Company','description'=>'Joined Synthetic Corp'],
 ['title'=>'Salary Updated','description'=>'Salary changed from ₹100000 to ₹125000'],
 ['title'=>'Promoted to Manager','description'=>'Monthly compensation: ₹125000'],
 ['title'=>'Annual revision','description'=>'₹125000 (10% hike)']
]);
$pdo->prepare('INSERT INTO employee (id,"userId","employeeId","firstName","lastName",email,department,position,branch,"joinDate",salary,status,timeline) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)')
    ->execute([$emp,$alice,'EMP-SYNTH','Alice','Synthetic','alice@example.invalid','Training','Engineer',$branch,'2026-01-01',125000,'active',$timeline]);
$pdo->prepare('INSERT INTO payslips VALUES (?, ?, 2026, 10, 125000, ?, ?::jsonb, ?::jsonb, ?::jsonb, now())')
    ->execute(['00000000-0000-4000-8000-000000000019',$alice,'Generated','{}','{}','{}']);
$q='00000000-0000-4000-8000-0000000000a1';
$pdo->prepare('INSERT INTO department_question_bank VALUES (?,?,?,?::jsonb,?::jsonb,?)')
    ->execute([$q,'Synthetic question?','single_choice','["A","B"]','[0]',0]);
$insertA=$pdo->prepare('INSERT INTO assessments
 (id,title,department,duration_minutes,passing_percentage,max_attempts,marks_per_question,
 randomize_questions,randomize_options,result_visibility,assessment_date,selected_questions,assigned_employee_ids,status,questions_count)
 VALUES (?,?,?,1,60,2,1,false,false,?,NULL,?::jsonb,?::jsonb,?,1)');
$active='00000000-0000-4000-8000-0000000000b1';
$expired='00000000-0000-4000-8000-0000000000b2';
$inactive='00000000-0000-4000-8000-0000000000b3';
$questions=json_encode([$q]);
foreach ([
 [$active,'Active Test',json_encode([$alice]),'Active'],
 [$expired,'Expired Test',json_encode([$alice]),'Active'],
 [$inactive,'Inactive Test',json_encode([$alice]),'Inactive'],
] as [$id,$title,$assigned,$status]) {
    $insertA->execute([$id,$title,'Training','immediate',$questions,$assigned,$status]);
}
$insertAtt=$pdo->prepare('INSERT INTO assessment_attempts
(id,assessment_id,employee_id,attempt_number,start_time,status,answers_data,percentage,passed)
VALUES (?,?,?,1,now() - ?::interval,?,?::jsonb,0,false)');
$expiredAttempt='00000000-0000-4000-8000-0000000000c2';
$revokedAttempt='00000000-0000-4000-8000-0000000000c3';
$revokedGraded='00000000-0000-4000-8000-0000000000c4';
$insertAtt->execute([$expiredAttempt,$expired,$alice,'200 seconds','in_progress','{}']);
$insertAtt->execute([$revokedAttempt,$active,$bob,'10 seconds','in_progress','{}']);
$insertAtt->execute([$revokedGraded,$active,$bob,'200 seconds','graded','{}']);
echo "SEC-013 isolated fixtures seeded\n";
