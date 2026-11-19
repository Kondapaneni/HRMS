import EmailTemplatePreview from './EmailTemplatePreview';
import React from 'react';
import templateHtml from '../../../../backend/src/Templates/welcome_email.html?raw';

const WelcomeEmailTemplate = () => {
  const htmlContent = templateHtml
    .replace(/\{\{firstName\}\}/g, '[Employee First Name]')
    .replace(/\{\{email\}\}/g, '[Employee Email]')
    .replace(/\{\{password\}\}/g, '[Generated Password]')
    .replace(/\{\{loginLink\}\}/g, '#')
    .replace(/\{\{currentYear\}\}/g, new Date().getFullYear());

  return <EmailTemplatePreview html={htmlContent} />;
};

export default WelcomeEmailTemplate;
