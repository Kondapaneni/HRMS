import { useEffect, useState } from 'react';
import { formatAssessmentBusinessDate } from '../utils/assessmentBusinessDate';

// Keep employee assessment availability accurate when a tab stays open
// across India midnight or a laptop resumes from sleep.
export default function useAssessmentBusinessDate() {
  const [todayStr, setTodayStr] = useState(() => formatAssessmentBusinessDate());

  useEffect(() => {
    const updateDay = () => setTodayStr(formatAssessmentBusinessDate());
    const interval = window.setInterval(updateDay, 30_000);

    // Also correct immediately when a tab returns to the foreground.
    document.addEventListener('visibilitychange', updateDay);
    window.addEventListener('focus', updateDay);
    updateDay();

    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', updateDay);
      window.removeEventListener('focus', updateDay);
    };
  }, []);

  return todayStr;
}
