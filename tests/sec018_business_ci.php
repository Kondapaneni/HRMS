<?php
declare(strict_types=1);
// Real catalog schema + actual restricted role. Entire workload is rolled back.
if (getenv('GITHUB_ACTIONS')!=='true'||getenv('DB_DATABASE')!=='sec018_phasea_ci') exit(2);
require __DIR__.'/../backend/src/Utils/Sec018AuditContext.php';
require __DIR__.'/../backend/src/Config/LoggingPDO.php';
use App\Config\LoggingPDO;
$_ENV['SEC018_AUDIT_CONTEXT_ENABLED']='true';
$_ENV['SEC018_AUDIT_HMAC_KEY']='ac9f1c12ebd1677a7a32e1c79b4d2a808feca339589d302d1bdb102edc4b9e1a';
$c=new LoggingPDO('pgsql:host=127.0.0.1;port=6432;dbname=sec018_phasea_ci','hrms_runtime_restricted','SEC018_PHASEA_CI_RUNTIME_ONLY',[
 PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_EMULATE_PREPARES=>true,PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC]);
$a='11111111-1111-4111-8111-111111111111';
$c->setSec018AuditIdentity(['uid'=>$a,'tv'=>1,'ip'=>'127.0.0.1','ua'=>'SEC018-business','sid'=>bin2hex(random_bytes(16))]);
function ins(LoggingPDO $c,string $table,array $values): array {
 $cols=implode(',',array_map(fn($s)=>'"'.$s.'"',array_keys($values)));
 $sql='INSERT INTO public.'.$table.' ('.$cols.') VALUES ('.implode(',',array_fill(0,count($values),'?')).') RETURNING *';
 $q=$c->prepare($sql);$q->execute(array_values($values));echo "PASS restricted INSERT $table\n";return $q->fetch();
}
$c->beginTransaction();
try {
 $user=ins($c,'users',['email'=>'candidate-ci@example.invalid','password'=>'synthetic-only','role'=>'candidate']);
 $emp=ins($c,'employee',['employeeId'=>'SEC018-CI','userId'=>$a,'status'=>'active','joinDate'=>date('Y-m-d')]);
 ins($c,'user_feature_access',['userId'=>$a,'canAttendance'=>'true']);
 ins($c,'global_settings',['session_timeout'=>'30']);
 ins($c,'geofences',['name'=>'Synthetic','latitude'=>0,'longitude'=>0]);
 ins($c,'shift_times',['shiftLabel'=>'CI','startTime'=>'09:00','endTime'=>'18:00']);
 ins($c,'company_holidays',['id'=>'33333333-3333-4333-8333-333333333333','holidayName'=>'Synthetic','holidayDate'=>'2099-01-01']);
 $att=ins($c,'attendance',['employeeId'=>$a,'date'=>date('Y-m-d'),'status'=>'present']);
 ins($c,'attendance_punches',['employeeId'=>$a,'attendanceId'=>$att['id'],'punchTime'=>date('Y-m-d H:i:s')]);
 ins($c,'leave_balances',['employeeId'=>$a]);
 ins($c,'leaves',['employeeId'=>$a,'leaveType'=>'paid','startDate'=>'2099-01-02','endDate'=>'2099-01-02','days'=>1]);
 ins($c,'payslips',['employeeId'=>$a,'month'=>1,'year'=>2099,'netSalary'=>100]);
 ins($c,'expenses',['user_id'=>$a,'title'=>'Synthetic','amount'=>1,'category'=>'Travel']);
 ins($c,'assets',['name'=>'Synthetic','category'=>'Laptop','assigned_to'=>$emp['id']]);
 $job=ins($c,'jobs',['title'=>'Synthetic','department'=>'Test','location'=>'Test','type'=>'Full-time']);
 $application=ins($c,'applications',['job_id'=>$job['id'],'candidate_id'=>$user['id']]);
 ins($c,'application_timeline',['application_id'=>$application['id'],'status_change'=>'Applied','updated_by'=>$a]);
 ins($c,'candidate_profiles',['user_id'=>$user['id'],'phone'=>'0000000000']);
 ins($c,'candidate_documents',['candidate_id'=>$user['id'],'document_type'=>'Resume','file_path'=>'synthetic/none','file_name'=>'none.txt']);
 $assessment=ins($c,'assessments',['title'=>'Synthetic']);
 ins($c,'assessment_attempts',['assessment_id'=>$assessment['id'],'employee_id'=>$emp['id']]);
 ins($c,'department_question_bank',['department'=>'Test','question_text'=>'Synthetic']);
 $video=ins($c,'training_videos',['title'=>'Synthetic','video_url'=>'https://example.invalid/none','created_by'=>$a]);
 ins($c,'employee_training_progress',['employee_id'=>$emp['id'],'user_id'=>$a,'video_id'=>$video['id']]);
 $lead=ins($c,'loan_leads',['name'=>'Synthetic','phone'=>'0000000000','address'=>'Test','created_by'=>$a]);
 $loan=ins($c,'loan_applications',['application_id'=>'SEC018-CI','lead_id'=>$lead['id'],'created_by'=>$a]);
 ins($c,'loan_documents',['application_id'=>'SEC018-CI','slot_key'=>'Synthetic','url'=>'https://example.invalid/none']);
 ins($c,'loan_application_audit_logs',['application_id'=>'SEC018-CI','loan_application_id'=>$loan['id'],'editor_name'=>'Synthetic','editor_user_id'=>$a]);
 ins($c,'origination_activities',['title'=>'Synthetic','start_date'=>'2099-01-01','created_by'=>$a]);
 ins($c,'sale_leads',['name'=>'Synthetic','phone'=>'0000000000','created_by'=>$a]);
 ins($c,'mfa_secrets',['user_id'=>$a,'secret'=>'SYNTHETIC_ONLY','confirmed'=>'false']);
 ins($c,'mfa_backup_codes',['user_id'=>$a,'code_hash'=>'synthetic-only']);
 ins($c,'rate_limits',['ip_address'=>'127.0.0.1','action'=>'ci']);
 ins($c,'portal_item_reads',['user_id'=>$a,'item_id'=>'ci','last_seen_at'=>date('Y-m-d H:i:s'),'portal_key'=>'ci','item_type'=>'ci']);
 ins($c,'email_queue',['to_email'=>'nobody@example.invalid','subject'=>'Synthetic','body'=>'Never delivered']);
 ins($c,'hrms_refresh_sessions',['user_id'=>$a,'token_hash'=>str_repeat('0',64),'session_version'=>1,'client_type'=>'android','expires_at'=>'2099-01-01']);
 $c->prepare("INSERT INTO public.loan_documents(application_id,slot_key,url) VALUES (?,?,?) ON CONFLICT(application_id,slot_key) DO UPDATE SET url=EXCLUDED.url")->execute(['SEC018-CI','Synthetic','https://example.invalid/replaced']);
 if($c->query("SELECT url FROM public.loan_documents WHERE application_id='SEC018-CI'")->fetchColumn()!=='https://example.invalid/replaced')throw new RuntimeException('loan document upsert');
 echo "PASS actual loan-document conflict update\n";
 $names=$c->query("SELECT tablename FROM pg_tables WHERE schemaname='public'")->fetchAll(PDO::FETCH_COLUMN);
 if(count($names)!==38)throw new RuntimeException('inventory');
 foreach($names as $name){$c->query('SELECT * FROM public."'.$name.'" LIMIT 1')->fetchAll();echo "PASS restricted SELECT $name\n";}
 $count=$c->query("SELECT count(*) FROM public.audit_logs WHERE actor_user_id='$a' AND browser_information='SEC018-business'")->fetchColumn();
 if((int)$count<7)throw new RuntimeException('all seven audit trigger families must run');
 // Version self-revocation must remain auditable, rather than fail after update.
 $c->prepare('UPDATE public.users SET token_version=token_version+1 WHERE id=?')->execute([$a]);
 $c->clearSec018AuditIdentity();
 $c->prepare('UPDATE public.users SET "lastName"=? WHERE id=?')->execute(['ClearedIdentity',$a]);
 $q=$c->query("SELECT count(*) FROM public.audit_logs WHERE new_values->>'lastName'='ClearedIdentity' AND actor_user_id IS NULL");
 if((int)$q->fetchColumn()!==1)throw new RuntimeException('identity must clear inside transaction');
 echo "PASS all 38 real-schema table reads, 36 required inserts, seven audit trigger families and in-transaction identity cleanup\n";
} finally {if($c->inTransaction())$c->rollBack();}
