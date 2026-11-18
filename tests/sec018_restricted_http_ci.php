<?php
declare(strict_types=1);
if(getenv('GITHUB_ACTIONS')!=='true'||getenv('DB_DATABASE')!=='sec018_phasea_ci')exit(2);
require __DIR__.'/../backend/vendor/autoload.php';
function assertHttp(bool $ok,string $s): void {if(!$ok)throw new RuntimeException($s);echo "PASS $s\n";}
$owner=new PDO('pgsql:host=127.0.0.1;port=5432;dbname=sec018_phasea_ci','postgres','SEC018_PHASEA_CI_PG_ONLY',[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);
$ids=['admin'=>'33333333-3333-4333-8333-333333333333','employee'=>'44444444-4444-4444-8444-444444444444','candidate'=>'55555555-5555-4555-8555-555555555555'];
foreach($ids as $role=>$id){
 $owner->prepare('INSERT INTO users(id,email,password,role,"firstName","lastName") VALUES (?,?,?,?,?,?)')->execute([$id,"$role-ci@example.invalid",password_hash('SEC018-CI-Password1!',PASSWORD_DEFAULT),$role,'Synthetic',$role]);
 if($role!=='candidate')$owner->prepare('INSERT INTO employee("userId","employeeId",status) VALUES (?,?,?)')->execute([$id,'SEC018-'.$role,'active']);
}
$owner->exec('INSERT INTO global_settings(session_timeout) VALUES (30)');
function httpCall(string $method,string $path,?string $token=null,?array $data=null,array $extra=[]):array {
 $curl=curl_init('http://127.0.0.1:8788'.$path);$headers=['Content-Type: application/json',...$extra];if($token)$headers[]='Authorization: Bearer '.$token;
 curl_setopt_array($curl,[CURLOPT_CUSTOMREQUEST=>$method,CURLOPT_HTTPHEADER=>$headers,CURLOPT_RETURNTRANSFER=>true,CURLOPT_HEADER=>true,CURLOPT_TIMEOUT=>20]);
 if($data!==null)curl_setopt($curl,CURLOPT_POSTFIELDS,json_encode($data));
 $all=curl_exec($curl);if($all===false)throw new RuntimeException(curl_error($curl));
 $code=curl_getinfo($curl,CURLINFO_RESPONSE_CODE);$len=curl_getinfo($curl,CURLINFO_HEADER_SIZE);$h=substr($all,0,$len);$raw=substr($all,$len);curl_close($curl);
 assertHttp(!preg_match('/SQLSTATE|Stack trace|SEC018_PHASEA_CI_|ac9f1c12|PDOException/i',$raw),"sanitized response $method $path");
 return [$code,json_decode($raw,true),$h];
}
$tokens=[];
foreach($ids as $role=>$id){
 [$code,$body,$headers]=httpCall('POST',$role==='candidate'?'/api/candidate/login':'/api/login',null,['email'=>"$role-ci@example.invalid",'password'=>'SEC018-CI-Password1!'],['X-HRMS-Client: android']);
 assertHttp($code===200&&isset($body['token']),"$role native login through restricted pooled connection ($code)");$tokens[$role]=$body['token'];
 assertHttp(isset($body['refreshToken'])&&!str_contains($headers,'hrms_refresh='),"$role native refresh is Keystore-only");
}
foreach(['/api/admin/assets','/api/admin/attendance','/api/admin/payroll','/api/admin/jobs','/api/admin/training/videos','/api/branches'] as $path){[$code]=httpCall('GET',$path,$tokens['admin']);assertHttp($code===200,"Admin read $path ($code)");}
foreach(['/api/employee/profile','/api/employee/training/videos','/api/mfa/status'] as $path){[$code]=httpCall('GET',$path,$tokens['employee']);assertHttp($code===200,"Employee read $path ($code)");}
foreach(['/api/candidate/profile','/api/candidate/jobs','/api/candidate/applications'] as $path){[$code]=httpCall('GET',$path,$tokens['candidate']);assertHttp($code===200,"Candidate read $path ($code)");}
[$code,$body]=httpCall('POST','/api/admin/assets',$tokens['admin'],['name'=>'SEC018 HTTP asset','category'=>'Laptop']);
assertHttp($code===201,'Admin creates audited asset');$asset=$body['data']['id'];
$q=$owner->prepare('SELECT actor_user_id FROM audit_logs WHERE entity_id=? AND action_type=?');$q->execute([$asset,'INSERT']);assertHttp($q->fetchColumn()===$ids['admin'],'HTTP actor derived from verified Admin JWT');
foreach(['employee','candidate'] as $role){[$code]=httpCall('PUT','/api/admin/assets/'.$asset,$tokens[$role],['name'=>'Unauthorized']);assertHttp($code===403,"$role cannot mutate Admin asset");}
$q=$owner->prepare('SELECT name FROM assets WHERE id=?');$q->execute([$asset]);assertHttp($q->fetchColumn()==='SEC018 HTTP asset','denied requests preserve protected data');
[$code]=httpCall('PUT','/api/admin/assets/'.$asset,$tokens['admin'],['name'=>'SEC018 HTTP updated']);assertHttp($code===200,'Admin updates asset with trigger');
[$code]=httpCall('DELETE','/api/admin/assets/'.$asset,$tokens['admin']);assertHttp($code===200,'Admin deletes audited asset');
[$code]=httpCall('PUT','/api/admin/assets/not-a-uuid',$tokens['admin'],['name'=>'Error']);assertHttp($code===500,'real PostgreSQL cast error is sanitized');
[$code,$native]=httpCall('POST','/api/login',null,['email'=>'employee-ci@example.invalid','password'=>'SEC018-CI-Password1!'],['X-HRMS-Client: android']);
assertHttp($code===200&&isset($native['refreshToken']),'Android login returns refresh credential');
[$code,$rotated]=httpCall('POST','/api/auth/refresh',null,['refreshToken'=>$native['refreshToken']],['X-HRMS-Client: android','X-HRMS-Refresh: 1']);assertHttp($code===200&&$rotated['refreshToken']!==$native['refreshToken'],'Android rotates exactly once');
[$code]=httpCall('POST','/api/auth/refresh',null,['refreshToken'=>$native['refreshToken']],['X-HRMS-Client: android','X-HRMS-Refresh: 1']);assertHttp($code===401,'Android duplicate denied');
[$code]=httpCall('POST','/api/logout',$tokens['employee'],[]);assertHttp($code===200,'audited logout can increment own session version');
[$code]=httpCall('GET','/api/employee/profile',$tokens['employee']);assertHttp($code===401,'logout revokes existing JWT');
[$code]=httpCall('POST','/api/auth/refresh',null,['refreshToken'=>$rotated['refreshToken']],['X-HRMS-Client: android','X-HRMS-Refresh: 1']);assertHttp($code===401,'logout revokes Android refresh');
echo "SEC018 RESTRICTED HTTP PASSED\n";
