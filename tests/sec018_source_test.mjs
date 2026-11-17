import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const db = read('backend/src/Config/Database.php');
const hierarchy = read('backend/src/Utils/HierarchyHelper.php');
const employee = read('backend/public/admin_employees_routes.php');
const entrypoint = read('backend/public/index.php');
const migration = read('supabase/migrations/20261115_sec018_mfa_schema.sql');
assert(db.includes('DB_PDO_PREPARE_MODE') &&
  db.includes("getenv('DB_PDO_PREPARE_MODE') ?: 'pooler'") &&
  db.includes("PDO::ATTR_EMULATE_PREPARES, $prepareMode !== 'native'"),
  'Pooler default with explicit native override required');
assert(!/echo\s+.*getMessage\(\)/.test(db), 'Do not echo database failure');
assert(!hierarchy.includes(':uid OR id = :uid') &&
  hierarchy.includes(':emp_user_id') &&
  hierarchy.includes(':emp_row_id') &&
  hierarchy.includes(':account_id'),
  'Repeated named placeholders are incompatible with native PDO prepares');
const ddl = /\b(?:ALTER|CREATE|DROP|TRUNCATE)\s+(?:TABLE|INDEX|SEQUENCE|SCHEMA)\b/i;
for (const name of readdirSync(new URL('../backend/public/', import.meta.url)).filter(x => x.endsWith('.php'))) {
  assert(!ddl.test(read('backend/public/' + name)), 'No request-time schema DDL: ' + name);
}
assert(!employee.includes("$conn->exec('ALTER TABLE"), 'Employee settings cannot migrate schema');
assert(migration.includes('ALTER TABLE public.users') &&
  migration.includes('ADD COLUMN IF NOT EXISTS "mfaEnabled"'),
  'MFA schema update belongs to a separate migration');
assert(entrypoint.includes('API server error response sanitized') &&
  entrypoint.includes("'Internal server error'") &&
  entrypoint.includes('getStatusCode() < 500') &&
  entrypoint.includes('new \\Slim\\Psr7\\Factory\\StreamFactory()'),
  'Server error responses must be redacted');
console.log('PASS SEC-018 source: pooler-compatible default, opt-in native prepares, no HTTP DDL, redaction');
