import React from 'react';
import templateHtml from '../../../../backend/src/Templates/assessment_result_email.html?raw';

const AssessmentResultEmailTemplate = () => {
  const htmlContent = templateHtml
    .replace(/\{\{employeeName\}\}/g, '[Employee Name]')
    .replace(/\{\{assessmentTitle\}\}/g, 'Q3 Information Security & Cloud Architecture')
    .replace(/\{\{finalPercentage\}\}/g, '92')
    .replace(/\{\{resultOutcome\}\}/g, 'PASSED')
    .replace(/\{\{obtainedMarks\}\}/g, '23')
    .replace(/\{\{totalMarks\}\}/g, '25')
    .replace(/\{\{resultLink\}\}/g, '#')
    .replace(/\{\{currentYear\}\}/g, new Date().getFullYear());

  return <div dangerouslySetInnerHTML={{ __html: htmlContent }} />;
};

export default AssessmentResultEmailTemplate;
