import templateHtml from "../../../../backend/src/Templates/candidate_application_success_email.html?raw";

const CandidateApplicationSuccessEmailTemplate = () => {
  // Replace the template variables with mock data for preview
  const previewHtml = templateHtml
    .replace(/{{firstName}}/g, "John")
    .replace(/{{jobTitle}}/g, "Software Engineer")
    .replace(/{{dashboardLink}}/g, "#")
    .replace(/{{currentYear}}/g, new Date().getFullYear());

  return (
    <div
      className="email-template-preview"
      dangerouslySetInnerHTML={{ __html: previewHtml }}
    />
  );
};

export default CandidateApplicationSuccessEmailTemplate;
