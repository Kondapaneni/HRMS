import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { formatAssessmentBusinessDate, ASSESSMENT_TIME_ZONE } from '../frontend/src/utils/assessmentBusinessDate.js';

// This is the HRMS assessment calendar, not UTC or the device's timezone.
assert.equal(ASSESSMENT_TIME_ZONE, 'Asia/Kolkata');

const cases = [
  ['2026-11-14T18:29:59.000Z', '2026-11-14', 'last second before India midnight'],
  ['2026-11-14T18:30:00.000Z', '2026-11-15', 'first second of November 15 IST'],
  ['2026-11-14T19:34:00.000Z', '2026-11-15', 'user-reported 01:04 AM IST screenshot'],
  ['2026-11-15T17:00:00.000Z', '2026-11-15', 'evening of November 15 IST'],
  ['2026-11-15T18:30:00.000Z', '2026-11-16', 'next IST midnight'],
  ['2026-12-31T18:30:00.000Z', '2027-01-01', 'new-year boundary IST'],
  ['2026-03-31T18:30:00.000Z', '2026-04-01', 'month boundary IST'],
];

for (const tz of ['UTC', 'America/Los_Angeles', 'Pacific/Auckland', 'Asia/Kolkata']) {
  process.env.TZ = tz;
  for (const [utcInstant, expected, name] of cases) {
    assert.equal(
      formatAssessmentBusinessDate(new Date(utcInstant)),
      expected,
      `${name}: browser timezone ${tz}`
    );
  }
  console.log('PASS: assessment business date boundaries in device timezone', tz);
}

// The page, navigation and PHP backend must agree about the calendar.
// Read-only source guards: never execute or mutate the live application DB.
const page = readFileSync(new URL('../frontend/src/pages/EmployeeAssessments.jsx', import.meta.url), 'utf8');
const layout = readFileSync(new URL('../frontend/src/components/EmployeeLayout.jsx', import.meta.url), 'utf8');
const hook = readFileSync(new URL('../frontend/src/hooks/useAssessmentBusinessDate.js', import.meta.url), 'utf8');
const backend = readFileSync(new URL('../backend/public/index.php', import.meta.url), 'utf8');

assert(page.includes('useAssessmentBusinessDate()'), 'assessment page must use the business day hook');
assert(layout.includes('useAssessmentBusinessDate()'), 'employee nav must use the same business day hook');
assert(page.includes("scope: ['employeeAssessments', todayStr]"), 'assessment list must refetch across business midnight');
assert(layout.includes("scope: ['employeeAssessmentsList', todayStr]"), 'employee nav must refetch across business midnight');
assert(!page.includes("new Date().toISOString().split('T')[0]"), 'UTC ISO today extraction must not return');
assert(hook.includes('setInterval(updateDay'), 'open tabs must refresh date after midnight');
assert(hook.includes("addEventListener('visibilitychange'"), 'sleeping tabs must refresh on resume');
assert(backend.includes("date_default_timezone_set('Asia/Kolkata')"), 'server must use the same assessment calendar');

console.log('PASS: SEC-013 assessment scheduled-date timezone regression, no live writes');
