import { createFileRoute } from '@tanstack/react-router';
import { Helmet } from 'react-helmet-async';

export const Route = createFileRoute('/terms')({
  component: TermsOfService,
});

function TermsOfService() {
  return (
    <>
      <Helmet title="Terms of Service | SWUBASE" />
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <h1 className="mb-6 flex items-center justify-between">
          Terms of Service <span className="text-xs">(updated 2026-10-13)</span>
        </h1>

        <section className="mb-8">
          <h2 className="mb-4">1. Acceptance of Terms</h2>
          <p className="mb-4">
            By accessing or using SWU Base, you agree to be bound by these Terms of Service. If you
            do not agree to these terms, please do not use the service.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="mb-4">2. Description of Service</h2>
          <p className="mb-4">
            SWU Base provides tools for Star Wars: Unlimited players to track collections,
            wantlists, decks, discover creator content, publish articles, and interact with other
            users. The creator hub connects public videos to SWU cards, decks and tournaments. The
            service may be modified, updated, or changed at any time without notice.
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
            collection information, comments, creator profiles and articles. You retain ownership of
            content you create. By submitting content, you grant SWU Base a worldwide,
            non-exclusive, royalty-free license to use, reproduce, modify, adapt, publish, and
            display such content to operate and provide the service. Linking or importing a
            third-party video does not transfer ownership of that video to SWUBASE or grant rights
            beyond those you are entitled to grant.
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
            Wars: Unlimited (including images and symbols), is copyright Fantasy Flight Publishing
            Inc and Lucasfilm Ltd. SWUBASE is not endorsed or produced by FFG or LFL in any way.
          </p>
          <p className="mb-4">
            All other content and materials available through the service, such as the website
            design, code, and functionality, are owned by SWU Base or its licensors and are
            protected by copyright, trademark, and other intellectual property laws.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="mb-4">7. Limitation of Liability</h2>
          <p className="mb-4">
            SWU Base shall not be liable for any indirect, incidental, special, consequential, or
            punitive damages, including loss of profits, data, or goodwill, resulting from your
            access to or use of the service.
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
            SWU Base reserves the right to modify these Terms of Service at any time. We will
            provide notice of significant changes by posting the new Terms of Service on the
            website. Your continued use of the service after such changes constitutes your
            acceptance of the new terms.
          </p>
        </section>

        <section className="mb-8" id="creator-hub">
          <h2 className="mb-4">10. Creator Profiles and YouTube Features</h2>
          <p className="mb-4">
            Only connect channels you are authorized to manage. You are responsible for your profile
            information, publications and the access you give editors. Public directory listings do
            not by themselves mean that the creator has joined or endorsed SWUBASE.
          </p>
          <p className="mb-4">
            SWUBASE uses YouTube API Services. By using the YouTube features, you also agree to the{' '}
            <a
              className="underline"
              href="https://www.youtube.com/t/terms"
              target="_blank"
              rel="noopener noreferrer"
            >
              YouTube Terms of Service
            </a>
            . Connecting grants read-only access for channel verification and public video imports.
            SWUBASE does not upload, edit or delete videos on YouTube. Our{' '}
            <a className="underline" href="/privacy#youtube">
              Privacy Policy
            </a>{' '}
            explains what we collect, automated processing, revocation and how to request deletion
            of stored data.
          </p>
          <p className="mb-4">
            Public SWU videos may be listed automatically. Descriptions may be used to create
            chapters, suggest classifications and link or import deck lists with source attribution.
            Automated classifications and imported decks may contain errors or become outdated.
            Manual video imports start as drafts. Disconnecting a channel removes its stored
            credentials but leaves existing creations; you can unpublish content you manage and
            contact us for corrections or removal of stored data.
          </p>
          <p className="mb-4">
            Only publish content and links you have permission to share. Credit original creators
            and disclose sponsorships or paid promotions. We may remove content or restrict creator
            access for impersonation, misleading attribution, rights violations or other breaches of
            these terms. Third-party players and deckbuilding services are governed by their own
            terms and may change or become unavailable.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="mb-4">11. Contact Information</h2>
          <p className="mb-4">
            For questions, creator profile corrections, content removal or rights concerns, contact{' '}
            <a className="underline" href="mailto:info@swubase.com">
              info@swubase.com
            </a>{' '}
            and include the relevant profile or content links.
          </p>
        </section>
      </div>
    </>
  );
}
