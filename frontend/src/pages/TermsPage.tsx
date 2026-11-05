import React from 'react';

interface TermsSection {
  id: string;
  title: string;
  body: string[];
}

const SECTIONS: TermsSection[] = [
  {
    id: 'acceptance',
    title: '1. Acceptance of terms',
    body: [
      'By accessing or using Inventory Compass you agree to be bound by these Terms and Conditions. If you do not agree, you may not use the service.',
    ],
  },
  {
    id: 'description',
    title: '2. Description of Inventory Compass',
    body: [
      'Inventory Compass is a decision-support tool that uses sales history and related data to produce demand forecasts and replenishment recommendations.',
    ],
  },
  {
    id: 'responsibilities',
    title: '3. User responsibilities',
    body: [
      'You are responsible for the accuracy and completeness of the data you upload, including sales history, inventory levels, and lead-time information.',
      'You are responsible for verifying inventory decisions, including any purchase orders or stock adjustments you make, before acting on recommendations.',
    ],
  },
  {
    id: 'uploaded-data',
    title: '4. Uploaded data and permitted use',
    body: [
      'You retain ownership of the data you upload. You permit the service to process uploaded data solely to generate forecasts and recommendations.',
      'You may not upload data you do not have the right to process or use.',
    ],
  },
  {
    id: 'data-accuracy',
    title: '5. Data accuracy and validation',
    body: [
      'Forecasts are only as accurate as the uploaded history. Inventory Compass does not guarantee that forecasts will be accurate for your business.',
      'Validation warnings and data-quality messages returned by the service should be reviewed before relying on generated recommendations.',
    ],
  },
  {
    id: 'estimates',
    title: '6. Forecasts and recommendations are estimates',
    body: [
      'Demand forecasts and replenishment recommendations are estimates. They are not guarantees of future demand, stock levels, or business outcomes.',
      'You should treat recommendations as decision-support inputs and independently evaluate them against your operational context.',
    ],
  },
  {
    id: 'no-guarantee',
    title: '7. No guarantee of business outcomes',
    body: [
      'Inventory Compass does not warrant that use of the service will result in any particular business outcome, including reduced stockouts or increased sales.',
    ],
  },
  {
    id: 'user-responsibility',
    title: '8. Inventory decisions remain the user responsibility',
    body: [
      'You are solely responsible for inventory decisions, including stock counts, purchase orders, supplier negotiations, and write-offs.',
    ],
  },
  {
    id: 'service',
    title: '9. Service availability and technical limitations',
    body: [
      'The service is provided on an as-available basis. Maintenance, downtime, or data interruptions may affect availability.',
      'Forecasts may be affected by model limitations, insufficient history, or unusual demand patterns.',
    ],
  },
  {
    id: 'intellectual-property',
    title: '10. Intellectual property',
    body: [
      'The Inventory Compass application, interface, and associated documentation are protected intellectual property of their respective owners.',
    ],
  },
  {
    id: 'prohibited-use',
    title: '11. Prohibited use',
    body: [
      'You may not use the service to process data in violation of applicable law or to develop models for unauthorized purposes.',
    ],
  },
  {
    id: 'liability',
    title: '12. Limitation of liability',
    body: [
      'To the maximum extent permitted by law, Inventory Compass shall not be liable for indirect, incidental, or consequential losses arising from use of forecasts or recommendations.',
    ],
  },
  {
    id: 'changes',
    title: '13. Changes to the service or terms',
    body: [
      'These terms may be updated. Continued use of the service after changes constitutes acceptance of the revised terms.',
    ],
  },
  {
    id: 'contact',
    title: '14. Contact and issue reporting',
    body: [
      'Questions, defect reports, or support requests may be raised through the project repository issue tracker.',
    ],
  },
];

export const TermsPage: React.FC = () => {
  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-semibold text-[#202522] mb-2">Terms and Conditions</h2>
        <p className="text-sm text-[#68716b]">
          Version 1.0 — Effective November 5, 2026
        </p>
        <p className="text-sm text-[#68716b] mt-2 leading-relaxed">
          These terms describe the use of Inventory Compass, a decision-support tool for retail demand
          forecasting and replenishment planning.
        </p>
      </div>

      {SECTIONS.map((section) => (
        <section key={section.id} id={section.id} className="space-y-2 scroll-mt-24">
          <h3 className="text-base font-semibold text-[#202522]">{section.title}</h3>
          {section.body.map((paragraph, index) => (
            <p key={index} className="text-sm text-[#68716b] leading-relaxed">
              {paragraph}
            </p>
          ))}
        </section>
      ))}
    </div>
  );
};
