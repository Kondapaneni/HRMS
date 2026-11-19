import EmailTemplatePreview from './EmailTemplatePreview';
import React from 'react';
import templateHtml from '../../../../backend/src/Templates/assessment_assigned_email.html?raw';

const AssessmentAssignedEmailTemplate = () => {
  const htmlContent = templateHtml
    .replace(/\{\{employeeName\}\}/g, '[Employee Name]')
    .replace(/\{\{assessmentTitle\}\}/g, 'Q3 Information Security & Cloud Architecture')
    .replace(/\{\{durationMinutes\}\}/g, '45')
    .replace(/\{\{passingScore\}\}/g, '75')
    .replace(/\{\{totalQuestions\}\}/g, '25')
    .replace(/\{\{maxAttempts\}\}/g, '2')
    .replace(/\{\{assessmentLink\}\}/g, '#')
    .replace(/\{\{currentYear\}\}/g, new Date().getFullYear());

  return <EmailTemplatePreview html={htmlContent} />;
};

export default AssessmentAssignedEmailTemplate;
