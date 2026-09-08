import React from 'react';
import templateHtml from '../../../../backend/src/Templates/promotion_letter_email.html?raw';

const PromotionEmailTemplate = () => {
  // Replace template placeholders with realistic preview data
  const previewHtml = templateHtml
    .replace(/{{letterBadge}}/g, '★ Official Promotion Letter')
    .replace(/{{letterHeading}}/g, 'Congratulations, Gowtham!')
    .replace(/{{letterSubheading}}/g, 'We are proud to announce your promotion to <strong style="color: #1a73e8;">Senior Software Engineer</strong>.')
    .replace(/{{firstName}}/g, 'Gowtham')
    .replace(/{{employeeName}}/g, 'Gowtham Chowdary')
    .replace(/{{employeeId}}/g, 'EMP-802144')
    .replace(/{{openingParagraph}}/g, 'In recognition of your exceptional dedication, sustained performance, and impactful contributions to <strong>Acme Corp</strong>, the management and leadership team are pleased to officially promote you to the designation of <strong>Senior Software Engineer</strong>.')
    .replace(/{{oldPosition}}/g, 'Software Engineer')
    .replace(/{{newPosition}}/g, 'Senior Software Engineer')
    .replace(/{{oldSalary}}/g, '50,000')
    .replace(/{{newSalary}}/g, '75,000')
    .replace(/{{hikePercentage}}/g, '+50% Hike')
    .replace(/{{effectiveDate}}/g, new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }))
    .replace(/{{notes}}/g, 'Exceptional performance in system scaling and demonstrating exemplary mentorship to peers.')
    .replace(/{{closingNote}}/g, 'Your revised compensation and role responsibilities will take effect as of the specified effective date. All other terms and conditions of your employment contract remain in full force and effect.')
    .replace(/{{currentYear}}/g, new Date().getFullYear());

  return (
    <div 
      className="email-template-preview"
      dangerouslySetInnerHTML={{ __html: previewHtml }} 
    />
  );
};

export default PromotionEmailTemplate;
