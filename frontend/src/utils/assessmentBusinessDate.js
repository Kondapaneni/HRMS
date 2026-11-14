// Assessments use the same business calendar as the PHP backend
// (backend/public/index.php sets date_default_timezone_set('Asia/Kolkata')).
// UTC ISO dates and device-local dates diverge around midnight in India.
export const ASSESSMENT_TIME_ZONE = 'Asia/Kolkata';

const businessDateFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: ASSESSMENT_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export function formatAssessmentBusinessDate(date = new Date()) {
  const parts = Object.fromEntries(
    businessDateFormatter.formatToParts(date)
      .filter(({ type }) => type === 'year' || type === 'month' || type === 'day')
      .map(({ type, value }) => [type, value])
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}
