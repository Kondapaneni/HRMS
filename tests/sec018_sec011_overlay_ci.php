<?php
declare(strict_types=1);
// Add the real SEC-018 role/verifier to the existing SEC-011 synthetic fixture.
// Existing cross-user/branch assertions remain unchanged.
if(getenv('GITHUB_ACTIONS')!=='true'||getenv('DB_HOST')!=='127.0.0.1'||getenv('DB_DATABASE')!=='sec011_test')exit(2);
$c=new PDO('pgsql:host=127.0.0.1;port=5432;dbname=sec011_test','postgres','sec011_synthetic_only',[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);
$c->exec('CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE SCHEMA extensions; CREATE EXTENSION pgcrypto WITH SCHEMA extensions; CREATE EXTENSION "uuid-ossp" WITH SCHEMA extensions; SET search_path=public,extensions');
foreach(['global_settings_id_seq','geofences_id_seq','shift_times_id_seq'] as $s)$c->exec('CREATE SEQUENCE IF NOT EXISTS public.'.$s);
$fixture=file_get_contents(__DIR__.'/sec018_phasea_schema_ci.sql');
preg_match_all('/CREATE TABLE public\.([a-z_]+) \([\s\S]*?\n\);/',$fixture,$tables,PREG_SET_ORDER);
foreach($tables as $t){
 $q=$c->prepare('SELECT to_regclass(?)');$q->execute(['public.'.$t[1]]);
 if(!$q->fetchColumn())$c->exec($t[0]);
 $c->exec('ALTER TABLE public.'.$t[1].' ENABLE ROW LEVEL SECURITY');
}
$c->exec('ALTER TABLE public.hrms_refresh_sessions FORCE ROW LEVEL SECURITY');
preg_match_all('/CREATE OR REPLACE FUNCTION public\.[\s\S]*?\$function\$[\s\S]*?\$function\$\s*;/',$fixture,$functions);
foreach($functions[0] as $sql)$c->exec($sql);
$c->exec(file_get_contents(__DIR__.'/../supabase/review-only/20261116_sec018_runtime_role_review_only.sql'));
$c->exec(file_get_contents(__DIR__.'/../supabase/review-only/20261116_sec018_signed_audit_review_only.sql'));
$c->exec("ALTER ROLE hrms_runtime_restricted LOGIN PASSWORD 'SEC018_PHASEA_CI_RUNTIME_ONLY'");
$c->prepare('INSERT INTO sec018_internal.audit_keys(kid,key_hex) VALUES (?,?)')->execute(['v1','ac9f1c12ebd1677a7a32e1c79b4d2a808feca339589d302d1bdb102edc4b9e1a']);
echo "SEC011 fixture now uses actual SEC018 role and verifier migrations\n";
