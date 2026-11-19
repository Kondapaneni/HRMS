import EmailTemplatePreview from './EmailTemplatePreview';
import templateHtml from '../../../../backend/src/Templates/candidate_interview_email.html?raw';

const CandidateInterviewEmailTemplate = () => {
  // Replace the template variables with mock data for preview
  const previewHtml = templateHtml
    .replace(/{{firstName}}/g, 'John')
    .replace(/{{jobTitle}}/g, 'Software Engineer')
    .replace(/{{interviewRound}}/g, '1st Round Interview')
    .replace(/{{additionalNotes}}/g, 'Interview scheduled for 2026-06-25 at 14:00, Location: Google Meet.\n\nPlease be on time and bring a copy of your resume.')
    .replace(/{{dashboardLink}}/g, '#')
    .replace(/{{currentYear}}/g, new Date().getFullYear());

  return (
    <EmailTemplatePreview html={previewHtml} className="email-template-preview" />
  );
};

export default CandidateInterviewEmailTemplate;
