import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

const adapter = read('frontend/src/lib/supabase.js');
const video = read('frontend/src/utils/videoCompressor.js');
const storage = read('backend/public/storage_routes.php');
const recruitment = read('frontend/src/pages/AdminRecruitment.jsx');
const loan = read('frontend/src/components/forms/LoanDocumentsSidebar.jsx');

assert(adapter.includes("api.post('/storage/upload'") &&
  adapter.includes("api.delete('/storage/object'"),
  'Browser storage mutations must pass through authenticated PHP');
assert(!adapter.includes('createClient(') &&
  !adapter.includes('supabaseAnonKey') &&
  !adapter.includes('VITE_SUPABASE_ANON_KEY'),
  'No direct Supabase SDK or anon storage key in browser adapter');
assert(video.includes("api.post('/storage/upload'"),
  'Video progress uploads must also use PHP backend');
assert(recruitment.includes("from '../lib/supabase'") &&
  loan.includes("from '../../lib/supabase'"),
  'Recruitment and loan documents must use the authenticated adapter');
assert(storage.includes('sec001Permission(') &&
  storage.includes('sec001ValidPath(') &&
  storage.includes('sec001Mime(') &&
  storage.includes("'x-upsert: false'"),
  'Storage backend must enforce ownership, safe paths, content checks and no overwrite');
const uploadStart = storage.indexOf("$app->post('/api/storage/upload'");
const uploadEnd = storage.indexOf("$app->delete('/api/storage/object'");
const upload = storage.slice(uploadStart, uploadEnd);
assert(upload.indexOf('$mime = sec001Mime(') < upload.indexOf('$config = sec001Config()'),
  'Reject invalid MIME before reading remote Storage config');
assert(upload.includes('413') && upload.includes('415') && upload.includes('403'),
  'Upload handler must fail closed for size, MIME and authorization');
console.log('PASS SEC-017 source: browser writes use authenticated backend and server validates files');
