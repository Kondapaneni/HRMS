import React from 'react';
import { PDFViewer } from '@react-pdf/renderer';
import OfferLetterPDF from './OfferLetterPDF';

// Loaded only when the Admin opens the offer-letter studio, not on Recruitment.
export default function OfferLetterPreview({ data }) {
  return (
    <PDFViewer width="100%" height="100%" className="border-none flex-1 w-full h-full">
      <OfferLetterPDF data={data} />
    </PDFViewer>
  );
}
