import React from 'react';
import templateHtml from '../../../../backend/src/Templates/promotion_letter_email.html?raw';

const PromotionEmailTemplate = () => {
  // Replace template placeholders with realistic preview data
  const previewHtml = templateHtml
    .replace(/{{firstName}}/g, 'Gowtham')
    .replace(/{{employeeName}}/g, 'Gowtham Chowdary')
    .replace(/{{employeeId}}/g, 'EMP-802144')
    .replace(/{{oldPosition}}/g, 'Software Engineer')
    .replace(/{{newPosition}}/g, 'Senior Software Engineer')
    .replace(/{{oldSalary}}/g, '50,000')
    .replace(/{{newSalary}}/g, '75,000')
    .replace(/{{hikePercentage}}/g, '+50% Hike')
    .replace(/{{effectiveDate}}/g, new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }))
    .replace(/{{notes}}/g, 'Exceptional performance in system scaling and demonstrating exemplary mentorship to peers.')
    .replace(/{{currentYear}}/g, new Date().getFullYear());

  return (
    <div 
      className="email-template-preview"
      dangerouslySetInnerHTML={{ __html: previewHtml }} 
    />
  );
};

export default PromotionEmailTemplate;
