import { createFileRoute } from '@tanstack/react-router';
import { Helmet } from 'react-helmet-async';

export const Route = createFileRoute('/terms')({
  component: TermsOfService,
});

function TermsOfService() {
  return (
    <>
      <Helmet title="Terms of Service | SWUBase" />
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <h1 className="mb-6 flex items-center justify-between">
          Terms of Service <span className="text-xs">(updated 2025-03-16)</span>
        </h1>

        <section className="mb-8">
          <h2 className="mb-4">1. Acceptance of Terms</h2>
          <p className="mb-4">
            By accessing or using SWU Base, you agree to be bound by these Terms of Service. If you do
            not agree to these terms, please do not use the service.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="mb-4">2. Description of Service</h2>
          <p className="mb-4">
            SWU Base provides tools for Star Wars: Unlimited players to track collections, wantlists,
            decks, and interact with other users. The service may be modified, updated, or changed at
            any time without notice.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="mb-4">3. User Accounts</h2>
          <p className="mb-4">
            To access certain features of the service, you may be required to create an account. You
            are responsible for maintaining the confidentiality of your account information and for
            all activities that occur under your account.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="mb-4">4. User Content</h2>
          <p className="mb-4">
            Users may submit content to the service including but not limited to deck lists,
            collection information, and comments. By submitting content, you grant SWU Base a
            worldwide, non-exclusive, royalty-free license to use, reproduce, modify, adapt, publish,
            and display such content.
          </p>
          <p className="mb-4">
            You represent and warrant that you own or have the necessary rights to the content you
            submit, and that such content does not violate the rights of any third party.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="mb-4">5. Prohibited Conduct</h2>
          <p className="mb-4">You agree not to:</p>
          <ul className="list-disc ml-8 mb-4">
            <li>Use the service for any illegal purpose</li>
            <li>Post unauthorized commercial communications</li>
            <li>Engage in unauthorized collection of users' content or information</li>
            <li>Upload viruses or malicious code</li>
            <li>Attempt to access data not intended for you</li>
            <li>Interfere with or disrupt the service or servers</li>
            <li>Create multiple accounts for misleading or fraudulent purposes</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="mb-4">6. Intellectual Property</h2>
          <p className="mb-4">
            SWU Base is an unofficial fan site. The information presented on this site about Star
            Wars: Unlimited (including images and symbols), is copyright Fantasy Flight Publishing Inc
            and Lucasfilm Ltd. SWUBASE is not endorsed or produced by FFG or LFL in any way.
          </p>
          <p className="mb-4">
            All other content and materials available through the service, such as the website design,
            code, and functionality, are owned by SWU Base or its licensors and are protected by
            copyright, trademark, and other intellectual property laws.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="mb-4">7. Limitation of Liability</h2>
          <p className="mb-4">
            SWU Base shall not be liable for any indirect, incidental, special, consequential, or
            punitive damages, including loss of profits, data, or goodwill, resulting from your access
            to or use of the service.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="mb-4">8. Termination</h2>
          <p className="mb-4">
            SWU Base may terminate or suspend your account and access to the service at any time,
            without prior notice or liability, for any reason.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="mb-4">9. Changes to Terms</h2>
          <p className="mb-4">
            SWU Base reserves the right to modify these Terms of Service at any time. We will provide
            notice of significant changes by posting the new Terms of Service on the website. Your
            continued use of the service after such changes constitutes your acceptance of the new
            terms.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="mb-4">10. Contact Information</h2>
          <p className="mb-4">
            If you have any questions about these Terms of Service, please contact us at
            [info@swubase.com].
          </p>
        </section>
      </div>
    </>
  );
}