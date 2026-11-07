import React from 'react';
import { sanitizeEmailHtml } from '../../utils/sanitizeEmailHtml';
import templateHtml from '../../../../backend/src/Templates/leave_email.html?raw';

const LeaveEmailTemplate = () => {
  const htmlContent = templateHtml
    .replace(/\{\{employeeName\}\}/g, '[Employee Name]')
    .replace(/\{\{status\}\}/g, 'Approved')
    .replace(/color: inherit; \/\* statusColor \*\//g, 'color: #10B981;') // Green for approved
    .replace(/\{\{leaveType\}\}/g, '[Leave Type]')
    .replace(/\{\{startDate\}\}/g, '[Start Date]')
    .replace(/\{\{endDate\}\}/g, '[End Date]')
    .replace(/\{\{currentYear\}\}/g, new Date().getFullYear());

  return <div dangerouslySetInnerHTML={{ __html: sanitizeEmailHtml(htmlContent) }} />;
};

export default LeaveEmailTemplate;
