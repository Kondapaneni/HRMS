import React, { useState } from 'react';
import templateHtml from '../../../../backend/src/Templates/promotion_letter_email.html?raw';
import { Award, TrendingUp, IndianRupee } from 'lucide-react';

const PromotionEmailTemplate = () => {
  const [variant, setVariant] = useState('full'); // 'full' | 'role_only' | 'salary_only'

  let badge = '★ Official Promotion & Salary Revision';
  let heading = 'Congratulations, Gowtham!';
  let subheading = 'We are proud to announce your promotion to <strong style="color: #5B86C2;">Senior Software Engineer</strong> and revision of your monthly compensation.';
  let opening = 'In recognition of your exceptional dedication, sustained performance, and impactful contributions to <strong>Acme Corp</strong>, the management and leadership team are pleased to officially promote you to the designation of <strong>Senior Software Engineer</strong> along with a revised compensation structure.';
  let closing = 'Your revised compensation and elevated role responsibilities will take effect as of the specified effective date. All other terms and conditions of your employment contract remain in full force and effect.';
  let termsHtml = '';

  if (variant === 'full') {
    badge = '★ Official Promotion & Salary Revision';
    heading = 'Congratulations, Gowtham!';
    subheading = 'We are proud to announce your promotion to <strong style="color: #5B86C2;">Senior Software Engineer</strong> and revision of your monthly compensation.';
    opening = 'In recognition of your exceptional dedication, sustained performance, and impactful contributions to <strong>Acme Corp</strong>, the management and leadership team are pleased to officially promote you to the designation of <strong>Senior Software Engineer</strong> along with a revised compensation structure.';
    closing = 'Your revised compensation and elevated role responsibilities will take effect as of the specified effective date. All other terms and conditions of your employment contract remain in full force and effect.';
    termsHtml = `
      <tr>
        <td style="padding: 14px 18px; border-bottom: 1px solid #eef0f2; font-size: 13px; color: #5f6368; width: 45%;">Previous Designation:</td>
        <td style="padding: 14px 18px; border-bottom: 1px solid #eef0f2; font-size: 13px; font-weight: 600; color: #5f6368; text-align: right;">Software Engineer</td>
      </tr>
      <tr>
        <td style="padding: 14px 18px; border-bottom: 1px solid #eef0f2; font-size: 13px; color: #137333; font-weight: 600;">Promoted Designation:</td>
        <td style="padding: 14px 18px; border-bottom: 1px solid #eef0f2; font-size: 14px; font-weight: 700; color: #5B86C2; text-align: right;">Senior Software Engineer</td>
      </tr>
      <tr>
        <td style="padding: 14px 18px; border-bottom: 1px solid #eef0f2; font-size: 13px; color: #5f6368;">Previous Monthly Salary:</td>
        <td style="padding: 14px 18px; border-bottom: 1px solid #eef0f2; font-size: 13px; font-weight: 600; color: #5f6368; text-align: right; text-decoration: line-through;">₹50,000.00</td>
      </tr>
      <tr>
        <td style="padding: 14px 18px; border-bottom: 1px solid #eef0f2; font-size: 13px; color: #137333; font-weight: 600;">Revised Monthly Salary:</td>
        <td style="padding: 14px 18px; border-bottom: 1px solid #eef0f2; font-size: 15px; font-weight: 700; color: #137333; text-align: right;">₹75,000.00 <span style="font-size: 11px; background-color: #e6f4ea; border: 1px solid #ceead6; color: #137333; padding: 2px 8px; border-radius: 100px; margin-left: 4px;">+50% Hike</span></td>
      </tr>
    `;
  } else if (variant === 'role_only') {
    badge = '★ Official Role Advancement';
    heading = 'Congratulations, Gowtham!';
    subheading = 'We are proud to announce your career advancement to <strong style="color: #5B86C2;">Staff Architect</strong>.';
    opening = 'In recognition of your demonstrated leadership, technical expertise, and outstanding commitments to <strong>Acme Corp</strong>, the management team is proud to officially promote you to the designation of <strong>Staff Architect</strong>.';
    closing = 'Your new role responsibilities will take effect as of the specified effective date. Your current compensation remains in effect. All other terms and conditions remain in full force.';
    termsHtml = `
      <tr>
        <td style="padding: 14px 18px; border-bottom: 1px solid #eef0f2; font-size: 13px; color: #5f6368; width: 45%;">Previous Designation:</td>
        <td style="padding: 14px 18px; border-bottom: 1px solid #eef0f2; font-size: 13px; font-weight: 600; color: #5f6368; text-align: right;">Senior Software Engineer</td>
      </tr>
      <tr>
        <td style="padding: 14px 18px; border-bottom: 1px solid #eef0f2; font-size: 13px; color: #137333; font-weight: 600;">Promoted Designation:</td>
        <td style="padding: 14px 18px; border-bottom: 1px solid #eef0f2; font-size: 14px; font-weight: 700; color: #5B86C2; text-align: right;">Staff Architect</td>
      </tr>
      <tr>
        <td style="padding: 14px 18px; border-bottom: 1px solid #eef0f2; font-size: 13px; color: #5f6368;">Base Monthly Salary:</td>
        <td style="padding: 14px 18px; border-bottom: 1px solid #eef0f2; font-size: 13px; font-weight: 600; color: #1f1f1f; text-align: right;">₹75,000.00 <span style="font-size: 11px; background-color: #f1f3f4; color: #444746; padding: 2px 8px; border-radius: 100px; margin-left: 4px;">Retained (Unchanged)</span></td>
      </tr>
    `;
  } else if (variant === 'salary_only') {
    badge = '★ Official Compensation Revision';
    heading = 'Salary Revision Notification, Gowtham';
    subheading = 'We are pleased to communicate the revision of your monthly compensation as <strong style="color: #5B86C2;">Senior Software Engineer</strong>.';
    opening = 'In appreciation of your valued contributions, commitment, and performance during this cycle, the leadership team at <strong>Acme Corp</strong> is pleased to approve a revision in your monthly compensation.';
    closing = 'Your revised monthly compensation will take effect as of the specified effective date. All other terms and conditions of your employment contract remain unchanged.';
    termsHtml = `
      <tr>
        <td style="padding: 14px 18px; border-bottom: 1px solid #eef0f2; font-size: 13px; color: #5f6368; width: 45%;">Official Designation:</td>
        <td style="padding: 14px 18px; border-bottom: 1px solid #eef0f2; font-size: 13px; font-weight: 600; color: #1f1f1f; text-align: right;">Senior Software Engineer <span style="font-size: 11px; background-color: #f1f3f4; color: #444746; padding: 2px 8px; border-radius: 100px; margin-left: 4px;">Current Role</span></td>
      </tr>
      <tr>
        <td style="padding: 14px 18px; border-bottom: 1px solid #eef0f2; font-size: 13px; color: #5f6368;">Previous Monthly Salary:</td>
        <td style="padding: 14px 18px; border-bottom: 1px solid #eef0f2; font-size: 13px; font-weight: 600; color: #5f6368; text-align: right; text-decoration: line-through;">₹75,000.00</td>
      </tr>
      <tr>
        <td style="padding: 14px 18px; border-bottom: 1px solid #eef0f2; font-size: 13px; color: #137333; font-weight: 600;">Revised Monthly Salary:</td>
        <td style="padding: 14px 18px; border-bottom: 1px solid #eef0f2; font-size: 15px; font-weight: 700; color: #137333; text-align: right;">₹90,000.00 <span style="font-size: 11px; background-color: #e6f4ea; border: 1px solid #ceead6; color: #137333; padding: 2px 8px; border-radius: 100px; margin-left: 4px;">+20% Hike</span></td>
      </tr>
    `;
  }

  const previewHtml = templateHtml
    .replace(/{{letterBadge}}/g, badge)
    .replace(/{{letterHeading}}/g, heading)
    .replace(/{{letterSubheading}}/g, subheading)
    .replace(/{{firstName}}/g, 'Gowtham')
    .replace(/{{employeeName}}/g, 'Gowtham Chowdary')
    .replace(/{{employeeId}}/g, 'EMP-802144')
    .replace(/{{openingParagraph}}/g, opening)
    .replace(/{{termsBreakdownHtml}}/g, termsHtml)
    .replace(/{{effectiveDate}}/g, new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }))
    .replace(/{{notes}}/g, 'Exceptional dedication, sustained high performance, and demonstrated technical leadership across core initiatives.')
    .replace(/{{closingNote}}/g, closing)
    .replace(/{{currentYear}}/g, new Date().getFullYear());

  return (
    <div className="space-y-4">
      {/* Variant Selector Tabs */}
      <div className="flex items-center justify-center p-1.5 bg-[var(--surface-alt)] border border-[var(--line)] rounded-full max-w-md mx-auto">
        <button
          type="button"
          onClick={() => setVariant('full')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-full text-xs font-semibold transition-all cursor-pointer ${
            variant === 'full'
              ? 'bg-[var(--surface)] text-[var(--brand-deep)] shadow-xs'
              : 'text-[var(--muted)] hover:text-[var(--text)]'
          }`}
        >
          <Award size={13} />
          <span>Role + Pay Hike</span>
        </button>
        <button
          type="button"
          onClick={() => setVariant('role_only')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-full text-xs font-semibold transition-all cursor-pointer ${
            variant === 'role_only'
              ? 'bg-[var(--surface)] text-[var(--brand-deep)] shadow-xs'
              : 'text-[var(--muted)] hover:text-[var(--text)]'
          }`}
        >
          <TrendingUp size={13} />
          <span>Role Only</span>
        </button>
        <button
          type="button"
          onClick={() => setVariant('salary_only')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-full text-xs font-semibold transition-all cursor-pointer ${
            variant === 'salary_only'
              ? 'bg-[var(--surface)] text-[var(--brand-deep)] shadow-xs'
              : 'text-[var(--muted)] hover:text-[var(--text)]'
          }`}
        >
          <IndianRupee size={13} />
          <span>Salary Only</span>
        </button>
      </div>

      <div 
        className="email-template-preview"
        dangerouslySetInnerHTML={{ __html: previewHtml }} 
      />
    </div>
  );
};

export default PromotionEmailTemplate;
