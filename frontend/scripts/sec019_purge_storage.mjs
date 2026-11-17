// SEC-019 owner-operated DEV reset. NOT imported by the browser application.
// Never put a service-role key into Vite variables or any committed file.
// Safe default: inventory only. Execution requires two explicit safeguards.
import { createClient } from '@supabase/supabase-js';

const PROJECT_REF = 'jtgqkkhqyzfbupiqwkgf';
const EXPECTED_BUCKETS = [
  'app_builds', 'attendance', 'avatars', 'candidate_documents',
  'expenses', 'holidays', 'job_descriptions', 'loan_documents',
  'loan_signatures', 'offer_letters', 'resumes', 'training_videos',
].sort();
const execute = process.argv.length === 3 && process.argv[2] === '--execute';
if (process.argv.length > 2 && !execute) {
  throw new Error('Unknown arguments. Use no arguments (safe inventory), or --execute.');
}
const url = process.env.SEC019_SUPABASE_URL ?? '';
const secret = process.env.SEC019_SUPABASE_SERVICE_KEY ?? '';
if (url !== `https://${PROJECT_REF}.supabase.co`) {
  throw new Error('Refusing to connect: SEC019_SUPABASE_URL must match the reviewed Acme HRMS DEV project.');
}
if (secret.length < 40) {
  throw new Error('Missing Supabase service-role key. Supply it only in the private local shell environment.');
}
if (execute && process.env.SEC019_CONFIRM_STORAGE_PURGE !== `EMPTY-DEV-STORAGE-${PROJECT_REF}`) {
  throw new Error('Execution blocked. Set the exact SEC019_CONFIRM_STORAGE_PURGE confirmation in the local shell.');
}

const client = createClient(url, secret, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});
const { data, error } = await client.storage.listBuckets();
if (error) throw new Error(`Unable to inspect buckets: ${error.message}`);
const found = data.map((bucket) => bucket.id).sort();
if (JSON.stringify(found) !== JSON.stringify(EXPECTED_BUCKETS)) {
  throw new Error(`Bucket inventory changed: expected ${EXPECTED_BUCKETS.length}, found ${found.length}. Refusing to proceed.`);
}
console.log(`Verified Acme HRMS DEV project ${PROJECT_REF}; ${found.length} known buckets.`);
if (!execute) {
  console.log('DRY RUN: no files removed. Run --execute only after stopping all DEV file writers and verifying the reset plan.');
  process.exit(0);
}
for (const bucket of found) {
  const { error: emptyError } = await client.storage.emptyBucket(bucket);
  if (emptyError) {
    throw new Error(`Storage clear FAILED for bucket ${bucket}: ${emptyError.message}. Stop and review; safe to retry once reviewed.`);
  }
  console.log(`Storage empty request accepted for: ${bucket}`);
}
console.log('All bucket-empty requests accepted. This is NOT proof all physical files are removed.');
console.log('Next: verify storage.objects has zero rows before any application-table reset.');
