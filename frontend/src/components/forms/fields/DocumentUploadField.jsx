import React from 'react';
import { FileUploadField } from './FileUploadField';

export const DocumentUploadField = React.memo(({
  documentType = 'document',
  accept = '.pdf,.jpg,.jpeg,.png',
  maxSizeMB = 10,
  helpText,
  ...props
}) => {
  const docHelp = helpText || `${documentType.toUpperCase()} file (.pdf, .jpg, .png) up to ${maxSizeMB}MB`;

  return (
    <FileUploadField
      {...props}
      accept={accept}
      maxSizeMB={maxSizeMB}
      helpText={docHelp}
    />
  );
});

DocumentUploadField.displayName = 'DocumentUploadField';
