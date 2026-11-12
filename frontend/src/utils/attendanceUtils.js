/**
 * Toast identifier and message displayed when an employee attempts an attendance
 * punch on a day covered by an approved leave.
 */
export const APPROVED_LEAVE_TOAST_ID = 'approved-leave-punch-blocked';
export const APPROVED_LEAVE_TOAST_MESSAGE =
  'You have an approved leave scheduled for today. Automated attendance recording is paused.';

const LEAVE_ATTENDANCE_STATUSES = new Set([
  'leave',
  'on leave',
  'paid leave',
  'unpaid leave',
  'sandwich leave',
]);

/**
 * Find today's attendance record from a list of employee attendance entries.
 */
export const findTodayAttendanceRecord = (records = [], today = new Date()) => {
  if (!Array.isArray(records)) return undefined;
  const todayStr = today.toLocaleDateString('en-CA');
  const todayDateString = today.toDateString();
  return (
    records.find((r) => r?.date?.split('T')[0] === todayStr) ||
    records.find((r) => r?.date && new Date(r.date).toDateString() === todayDateString)
  );
};

/**
 * Determine whether the employee is on an approved leave for today based on
 * either their leave history or today's attendance record status.
 */
export const isEmployeeOnLeaveToday = (
  leavesHistory = [],
  todayRecord = null,
  todayStr = new Date().toLocaleDateString('en-CA')
) => {
  const hasApprovedLeave =
    Array.isArray(leavesHistory) &&
    leavesHistory.some((leave) => {
      if (leave?.status?.toLowerCase() !== 'approved') return false;
      const start = String(leave.startDate || '').split('T')[0];
      const end = String(leave.endDate || '').split('T')[0];
      return Boolean(start && end && todayStr >= start && todayStr <= end);
    });

  if (hasApprovedLeave) return true;

  const status = String(todayRecord?.status || '').toLowerCase().trim();
  return LEAVE_ATTENDANCE_STATUSES.has(status) || status.endsWith(' leave');
};

