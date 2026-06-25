import React from 'react';
import templateHtml from '../../../../backend/src/Templates/reset_password.html?raw';

const ResetPasswordEmailTemplate = () => {
  const htmlContent = templateHtml
    .replace(/\{\{resetLink\}\}/g, '#')
    .replace(/\{\{currentYear\}\}/g, new Date().getFullYear());

  return <div dangerouslySetInnerHTML={{ __html: htmlContent }} />;
};

export default ResetPasswordEmailTemplate;
