import { platformConfig } from '~/config/platform';

export function LegalPage({ kind }: { kind: 'privacy' | 'terms' | 'cookies' }) {
  const contact = platformConfig.email.includes('example.com')
    ? '[CONTACT EMAIL — TO BE CONFIRMED]'
    : platformConfig.email;
  const owner =
    platformConfig.company === 'Tool Platform' ? '[LEGAL ENTITY — TO BE CONFIRMED]' : platformConfig.company;

  if (kind === 'privacy') {
    return (
      <article className="tp-legal">
        <h1>Privacy policy</h1>
        <p>
          <strong>Draft for legal review.</strong> This page describes the current public-beta architecture; it is not
          legal advice.
        </p>
        <h2>Local processing</h2>
        <p>
          Public file and utility tools marked “Works in your browser” process their inputs in the browser. Their file
          contents, passwords, tokens, hashes, customer details, and converted output are not sent to our analytics
          interface.
        </p>
        <h2>Browser storage</h2>
        <p>
          The application may use browser storage for necessary preferences and builder state. Business-document drafts
          are not automatically persisted.
        </p>
        <h2>Analytics, advertising, and cookies</h2>
        <p>
          No analytics provider or advertising network is connected to the public tools at this time. If that changes,
          this policy and any legally required consent controls must be updated before activation.
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
          {contact}
        </p>
      </article>
    );
  }

  if (kind === 'cookies') {
    return (
      <article className="tp-legal">
        <h1>Cookie notice</h1>
        <p>
          <strong>Draft for legal review.</strong> No advertising or analytics cookies are currently enabled on the
          public tools.
        </p>
        <p>
          Necessary browser storage may be used for application preferences and functionality. A consent banner is
          intentionally not shown while no optional cookie category is active.
        </p>
        <p>
          Before analytics or advertising is enabled, consent requirements must be reviewed for the launch jurisdictions
          and this notice updated.
        </p>
      </article>
    );
  }

  return (
    <article className="tp-legal">
      <h1>Terms of use</h1>
      <p>
        <strong>Draft for legal review; not legal advice.</strong> Final governing entity, jurisdiction, effective date,
        and contact details remain placeholders.
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
        Contact: {contact}
        <br />
        Governing law: [JURISDICTION — TO BE CONFIRMED]
      </p>
    </article>
  );
}
