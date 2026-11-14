<?php
declare(strict_types=1);

if (getenv('DB_DATABASE') !== 'sec011_test') {
    fwrite(STDERR, "SEC-011 verification refused non-isolated DB\n");
    exit(1);
}
$pdo = new PDO(
    'pgsql:host=' . (getenv('DB_HOST') ?: '127.0.0.1') .
    ';port=' . (getenv('DB_PORT') ?: '5432') . ';dbname=sec011_test',
    getenv('DB_USERNAME') ?: 'postgres', getenv('DB_PASSWORD') ?: '',
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
);
function check011($truth, string $test): void {
    if (!$truth) { fwrite(STDERR, "FAIL: {$test}\n"); exit(1); }
    echo "PASS: {$test}\n";
}
$loanStmt=$pdo->prepare('SELECT application_id, status, branch, created_by, form_data FROM loan_applications WHERE application_id = ?');
foreach (['LA-B1','LA-TRANSFERRED','LA-C1','LA-BRANCH'] as $appId) {
    $loanStmt->execute([$appId]);
    $row=$loanStmt->fetch(PDO::FETCH_ASSOC);
    check011((bool)$row, "foreign application {$appId} was never deleted");
    check011($row['status'] !== 'Approved', "foreign application {$appId} was not fraudulently approved");
}
$loanStmt->execute(['LA-B1']);
$bob=$loanStmt->fetch(PDO::FETCH_ASSOC);
check011($bob['status'] === 'Draft', 'same-branch stranger application retains original status');
check011(($bob['form_data'] && json_decode($bob['form_data'],true)['applicant_name'] === 'Synthetic Test'),
    'same-branch stranger application data was not overwritten');
$loanStmt->execute(['LA-TRANSFERRED']);
$transferred=$loanStmt->fetch(PDO::FETCH_ASSOC);
check011($transferred['status']==='Draft', 'loan moved to other branch remains intact');
$loanStmt->execute(['LA-C1']);
$carol=$loanStmt->fetch(PDO::FETCH_ASSOC);
check011(json_decode($carol['form_data'],true)['applicant_name'] === 'Synthetic Branch Edit',
    'same-branch operator allowed to update the legitimate record');
$docs=$pdo->query('SELECT application_id, slot_key, url FROM loan_documents')->fetchAll(PDO::FETCH_ASSOC);
$docIds=array_map(fn($d)=>$d['application_id'].'/'.$d['slot_key'], $docs);
check011(in_array('LA-B1/identity',$docIds,true),'foreign document survived denied delete');
check011(in_array('00000000-0000-4000-8000-00000000b001/shared-legacy',$docIds,true),
    'ambiguous lead document survived legitimate operation');
check011(!in_array('LA-B1/test_document',$docIds,true),
    'unauthorized caller could not write documents to a foreign application');
check011(!in_array('LA-A1/test_document',$docIds,true),
    'owner can delete their own test document');
$activityStmt=$pdo->prepare('SELECT assigned_to, status FROM origination_activities WHERE id = ?');
$activityStmt->execute(['00000000-0000-4000-8000-00000000c002']);
$bobActivity=$activityStmt->fetch(PDO::FETCH_ASSOC);
check011($bobActivity['assigned_to']==='00000000-0000-4000-8000-000000000007',
    'branch operator reassigned activity to same-branch employee only');
check011($bobActivity['status']==='Completed','branch operator completed branch activity');
$activityStmt->execute(['00000000-0000-4000-8000-00000000c003']);
$carolActivity=$activityStmt->fetch(PDO::FETCH_ASSOC);
check011($carolActivity['assigned_to']==='00000000-0000-4000-8000-000000000004',
    'explicit administrator cross-branch exception is functional');
$logCount=(int)$pdo->query('SELECT COUNT(*) FROM loan_application_audit_logs')->fetchColumn();
check011($logCount===2,'denied branch edits wrote no orphaned audit logs');
echo "SEC-011 synthetic database remained isolated after denied and permitted real HTTP mutations\n";
