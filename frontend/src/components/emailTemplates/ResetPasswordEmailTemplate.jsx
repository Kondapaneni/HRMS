import React from 'react';
import templateHtml from '../../../../backend/src/Templates/reset_password.html?raw';

const ResetPasswordEmailTemplate = () => {
  const htmlContent = templateHtml
    .replace(/\{\{resetLink\}\}/g, 'http://localhost:5173/reset-password?token=preview_token')
    .replace(/\{\{currentYear\}\}/g, new Date().getFullYear());

  return <div dangerouslySetInnerHTML={{ __html: htmlContent }} />;
};

export default ResetPasswordEmailTemplate;
