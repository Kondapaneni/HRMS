import React from 'react';
import { SelectField } from './SelectField';

const MAJOR_INDIAN_BANKS = [
  { label: 'State Bank of India (SBI)', value: 'State Bank of India' },
  { label: 'HDFC Bank', value: 'HDFC Bank' },
  { label: 'ICICI Bank', value: 'ICICI Bank' },
  { label: 'Axis Bank', value: 'Axis Bank' },
  { label: 'Kotak Mahindra Bank', value: 'Kotak Mahindra Bank' },
  { label: 'Punjab National Bank (PNB)', value: 'Punjab National Bank' },
  { label: 'Bank of Baroda', value: 'Bank of Baroda' },
  { label: 'Canara Bank', value: 'Canara Bank' },
  { label: 'Union Bank of India', value: 'Union Bank of India' },
  { label: 'IndusInd Bank', value: 'IndusInd Bank' },
  { label: 'IDFC FIRST Bank', value: 'IDFC FIRST Bank' },
  { label: 'Other', value: 'Other' }
];

export const BankNameField = React.memo(({ options = MAJOR_INDIAN_BANKS, placeholder = 'Select Bank...', ...props }) => {
  return (
    <SelectField
      {...props}
      options={options}
      placeholder={placeholder}
    />
  );
});

BankNameField.displayName = 'BankNameField';
