import React from 'react';

// No visual skeletons or loading captions anywhere in HRMS.
// Retain the existing first-load and authorization guards so private payroll,
// attendance and customer records are never shown before a fresh response.
// A screen-reader-only status does not occupy space or intercept navigation.
export const PageLoader = ({ message = 'Loading...' }) => (
  <span role="status" aria-live="polite" aria-busy="true" className="sr-only">
    {message}
  </span>
);

export default PageLoader;
