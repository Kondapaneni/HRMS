import React from "react";
import templateHtml from "../../../../backend/src/Templates/candidate_activate_email.html?raw";

const CandidateActivateEmailTemplate = () => {
  // Replace the template variables with mock data for preview
  const previewHtml = templateHtml
    .replace("{{firstName}}", "Sarah")
    .replace("{{activationLink}}", "#")
    .replace("{{currentYear}}", new Date().getFullYear());

  return <div dangerouslySetInnerHTML={{ __html: previewHtml }} />;
};

export default CandidateActivateEmailTemplate;
