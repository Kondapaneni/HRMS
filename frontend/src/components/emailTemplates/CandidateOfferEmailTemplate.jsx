import EmailTemplatePreview from './EmailTemplatePreview';
import templateHtml from '../../../../backend/src/Templates/candidate_offer_email.html?raw';

const CandidateOfferEmailTemplate = () => {
  // Replace the template variables with mock data for preview
  const previewHtml = templateHtml
    .replace(/{{firstName}}/g, 'Bhavya')
    .replace(/{{jobTitle}}/g, 'Software Engineer')
    .replace(/{{offerLetterUrl}}/g, '#')
    .replace(/{{dashboardLink}}/g, '#')
    .replace(/{{currentYear}}/g, new Date().getFullYear());

  return (
    <EmailTemplatePreview html={previewHtml} className="email-template-preview" />
  );
};

export default CandidateOfferEmailTemplate;
