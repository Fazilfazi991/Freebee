import { platformConfig } from '~/config/platform';

export function LegalPage({ kind }: { kind: 'privacy' | 'terms' | 'cookies' }) {
  const contact = platformConfig.legal.privacyEmail || platformConfig.email;
  const cookieContact = platformConfig.legal.cookieEmail || platformConfig.email;
  const owner = platformConfig.legal.entity || '[LEGAL ENTITY — TO BE CONFIRMED]';
  const effectiveDate = platformConfig.legal.effectiveDate || '[EFFECTIVE DATE — TO BE CONFIRMED]';

  if (kind === 'privacy') {
    return (
      <article className="tp-legal">
        <h1>Privacy policy</h1>
        <p>
          <strong>Draft for legal review.</strong> This page describes the current public-beta architecture; it is not
          legal advice.
        </p>
        <p>Effective date: {effectiveDate}</p>
        <h2>Local processing</h2>
        <p>
          Public file and utility tools marked “Works in your browser” process their inputs in the browser. Their file
          contents, passwords, tokens, hashes, customer details, and converted output are not sent to our analytics
          interface.
        </p>
        <h2>Browser storage</h2>
        <p>
          The application may use browser storage for necessary preferences and tool state. Business-document drafts
          are not automatically persisted.
        </p>
        <h2>Analytics, advertising, and cookies</h2>
        <p>
          Freebee may use Google Analytics 4 as an optional analytics service to understand aggregate tool usage,
          page performance, and navigation. It activates only after you select “Allow analytics” and can be changed
          later through Cookie settings. The service may receive page paths, page titles, tool/category metadata,
          processing status, and generic error codes. It does not receive tool inputs, file contents, filenames,
          calculator values, OCR/CSV content, passwords, tokens, customer details, or entered contact information.
          This wording is a draft for legal review and does not make jurisdiction-specific claims.
        </p>
        <h2>Future services</h2>
        <p>
          Future server or AI features may process data differently and must receive their own accurate disclosure. This
          policy does not claim that every future feature will be local.
        </p>
        <h2>Contact</h2>
        <p>
          {owner}
          <br />
          <a href={`mailto:${contact}`}>{contact}</a>
        </p>
      </article>
    );
  }

  if (kind === 'cookies') {
    return (
      <article className="tp-legal">
        <h1>Cookie notice</h1>
        <p>
          <strong>Draft for legal review.</strong> Analytics is optional and is disabled until you choose “Allow
          analytics.”
        </p>
        <p>
          Necessary browser storage may be used for application preferences and functionality. A consent banner is
          intentionally not shown while no optional cookie category is active.
        </p>
        <p>
          “Only necessary” stores a denied analytics preference and does not load Google Analytics. You can change the
          preference later using Cookie settings. Analytics cookies, if enabled, are controlled by Google Analytics;
          retention and jurisdiction-specific requirements should be reviewed before activation.
        </p>
        <p>
          Contact: <a href={`mailto:${cookieContact}`}>{cookieContact}</a>
        </p>
      </article>
    );
  }

  return (
    <article className="tp-legal">
      <h1>Terms of use</h1>
      <p>
        <strong>Draft for legal review; not legal advice.</strong> Final governing entity, jurisdiction, and effective
        date remain to be confirmed.
      </p>
      <h2>Service</h2>
      <p>
        The tools are provided for general utility purposes. Outputs should be reviewed before business, legal,
        financial, or other consequential use.
      </p>
      <h2>Your content</h2>
      <p>
        You are responsible for having the right to process uploaded or entered content and for retaining your own
        copies.
      </p>
      <h2>Availability</h2>
      <p>Public-beta features may change, fail, or be withdrawn. No guarantee of uninterrupted availability is made.</p>
      <h2>Electronic signatures</h2>
      <p>The signature image tool creates an image only and does not verify identity or guarantee legal validity.</p>
      <h2>Required placeholders</h2>
      <p>
        Provider: {owner}
        <br />
        Contact: <a href={`mailto:${contact}`}>{contact}</a>
        <br />
        Registered address: {platformConfig.legal.registeredAddress || '[REGISTERED ADDRESS — TO BE CONFIRMED]'}
        <br />
        Jurisdiction: {platformConfig.legal.jurisdiction || '[JURISDICTION — TO BE CONFIRMED]'}
        <br />
        Governing law: {platformConfig.legal.governingLaw || '[GOVERNING LAW — TO BE CONFIRMED]'}
        <br />
        Effective date: {effectiveDate}
      </p>
    </article>
  );
}
