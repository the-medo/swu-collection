import { Button } from '@/components/ui/button';
import { createFileRoute } from '@tanstack/react-router';
import { Helmet } from 'react-helmet-async';

export const Route = createFileRoute('/privacy')({
  component: PrivacyPolicy,
});

function PrivacyPolicy() {
  return (
    <>
      <Helmet title="Privacy Policy | SWUBASE" />
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <h1 className="mb-6 flex items-center justify-between">
          Privacy policy <span className="text-xs">(updated 2026-10-13)</span>
        </h1>

        <section className="mb-8">
          <h2 className="mb-4">Introduction</h2>
          <p className="mb-4">
            SWU Base ("we", "our", or "us") is committed to protecting your privacy. This Privacy
            Policy explains how we collect, use, disclose, and safeguard your information when you
            use our website and services.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="mb-4">Information We Collect</h2>
          <h3 className="mb-2">Personal Information</h3>
          <p className="mb-4">
            We may collect personal information that you voluntarily provide when creating an
            account or using our services, including:
          </p>
          <ul className="list-disc ml-8 mb-4">
            <li>Name</li>
            <li>Email address</li>
            <li>Username</li>
            <li>Profile information</li>
            <li>Country / State</li>
          </ul>

          <h3 className="mb-2">Usage Information</h3>
          <p className="mb-4">
            We collect information about how you access and use our services. This data is
            completely anonymous and includes data such as:
          </p>
          <ul className="list-disc ml-8 mb-4">
            <li>Pages visited</li>
            <li>Click events</li>
            <li>Device and browser information</li>
            <li>Referrer URLs</li>
            <li>Other technical information related to your interaction with the site</li>
          </ul>

          <p className="mb-4">
            We use a third-party analytics provider (
            <Button variant="link" className="px-1 py-0 h-auto text-foreground/50" asChild>
              <a href="https://amplitude.com/" target="_blank">
                Amplitude
              </a>
            </Button>
            ). This means some interactions may be automatically logged to help us understand usage
            patterns and improve the service.{' '}
            <strong>Session replay is not used or enabled.</strong>
          </p>

          <h3 className="mb-2">User Content</h3>
          <p className="mb-4">
            We collect and store the content you create, upload, or receive from others when using
            our services, such as:
          </p>
          <ul className="list-disc ml-8 mb-4">
            <li>Collection information</li>
            <li>Deck lists</li>
            <li>Wantlists</li>
            <li>Comments and messages</li>
            <li>
              Creator profiles, social and support links, articles, drafts and revision history
            </li>
            <li>Linked videos, descriptions, timestamps, classifications and related deck lists</li>
          </ul>
        </section>

        <section className="mb-8" id="youtube">
          <h2 className="mb-4">Creator Profiles and YouTube</h2>
          <p className="mb-4">
            SWUBASE uses YouTube API Services to connect creator channels and display public video
            information. A creator profile is separate from a SWUBASE user account. The directory
            can also include profiles assembled from publicly available channel information before
            their creators join SWUBASE.
          </p>
          <p className="mb-4">
            Connecting YouTube is optional and separate from Google sign-in. With your permission,
            we request read-only YouTube access to verify your channel and import its public videos.
            We store the channel identifier, name and avatar, and video identifiers, titles,
            descriptions, thumbnails, publication dates, language and duration where available. We
            do not import private or unlisted videos. This permission does not allow SWUBASE to
            upload, edit or delete your YouTube videos.
          </p>
          <p className="mb-4">
            We store encrypted access and refresh tokens on our server to maintain the connection.
            Tokens are not included in public profiles or sent to other users. We do not receive
            your Google password. Public channel and video information may also be obtained through
            YouTube&apos;s public API without an account connection.
          </p>
          <p className="mb-4">
            Published creator profiles, social links, articles, video details, classifications and
            linked decks are visible to visitors. Unpublished creations and revision history are
            available to the profile owner and authorized editors. Video imports may be published
            automatically even when their SWU relevance is uncertain; clearly unrelated videos are
            excluded. Signed-in users can report videos as non-SWU. Reports, optional details and
            account identifiers are stored privately for administrators to review and resolve.
          </p>
          <h3 className="mb-2">Automated classification</h3>
          <p className="mb-4">
            For content discovery, public video titles, descriptions and language information may be
            sent to Google Gemini to suggest SWU relevance, tags, sets and leaders. This process
            does not send account credentials, unpublished articles, video or audio recordings, or
            transcripts to Gemini. Description timestamps and supported deck links may be used to
            add chapters and import related decks from their original deckbuilding services.
            Automated suggestions can be inaccurate and can be corrected by the creator or staff.
          </p>
          <p className="mb-4">
            We use Google API data for creator connections, imports and discovery. SWUBASE does not
            sell this data, use it for targeted advertising, or use it to train general-purpose AI
            models. These uses are subject to the{' '}
            <a
              className="underline"
              href="https://developers.google.com/terms/api-services-user-data-policy"
              target="_blank"
              rel="noopener noreferrer"
            >
              Google API Services User Data Policy
            </a>
            , including its Limited Use requirements.
          </p>
          <h3 className="mb-2">Embedded videos and external services</h3>
          <p className="mb-4">
            YouTube videos play through YouTube&apos;s embedded player. Loading a video page
            contacts YouTube even before playback; the player and its controls may receive your IP
            address, browser information and cookies or similar identifiers. YouTube may show
            advertising in its player. Channel images and other externally hosted images also
            contact their hosting services when loaded. Google&apos;s handling of information is
            described in the{' '}
            <a
              className="underline"
              href="https://policies.google.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
            >
              Google Privacy Policy
            </a>
            .
          </p>
          <h3 className="mb-2">Disconnecting, revoking access and deleting data</h3>
          <p className="mb-4">
            In Creator Studio, open Connections &amp; editors and disconnect a channel to remove its
            stored credentials and information obtained through that permission from SWUBASE. Public
            channel imports operate independently and continue unless you turn off auto-import for
            that channel. Independently obtained public information is refreshed separately. You can
            unpublish creations you manage, or request deletion of stored channel information,
            imported videos and related data by emailing{' '}
            <a className="underline" href="mailto:info@swubase.com">
              info@swubase.com
            </a>{' '}
            with the relevant profile or video links. The same contact handles correction and
            removal requests for directory profiles without an owner.
          </p>
          <p className="mb-4">
            You can also revoke SWUBASE&apos;s authorization in your{' '}
            <a
              className="underline"
              href="https://security.google.com/settings/security/permissions"
              target="_blank"
              rel="noopener noreferrer"
            >
              Google account permissions
            </a>
            . Our scheduled worker checks connections daily. When access is revoked, it removes
            unusable credentials and data obtained through that permission, including stored copies
            in revision history. Affected publications are unpublished. Temporary Google errors are
            retried; connections that cannot be verified for 28 days are disconnected. Removing data
            from SWUBASE does not delete your channel or videos on YouTube.
          </p>
          <p className="mb-4">
            The scheduled worker refreshes public video and channel metadata weekly and clears
            cached provider details after 28 days without a successful refresh. Confirmed private,
            removed or non-embeddable videos are unpublished. Metadata updates preserve fields you
            edited; removal also clears stored copies of provider text and images. Minimal source
            identifiers remain for synchronization and duplicate prevention. Contact us to request
            removal of your channel from the directory and its imports.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="mb-4">How We Use Your Information</h2>
          <p className="mb-4">
            We may use the information we collect for various purposes, including:
          </p>
          <ul className="list-disc ml-8 mb-4">
            <li>Providing and maintaining our services</li>
            <li>Improving our website and services</li>
            <li>Analyzing usage patterns to enhance user experience</li>
            <li>Communicating with you about updates or changes</li>
            <li>Detecting and preventing fraudulent or unauthorized activities</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="mb-4">Cookies and Tracking Technologies</h2>
          <p className="mb-4">
            We use cookies and similar tracking technologies to hold certain information. Cookies
            are files with a small amount of data that may include an anonymous unique identifier.
          </p>
          <p className="mb-4">We use cookies for:</p>
          <ul className="list-disc ml-8 mb-4">
            <li>Keeping you signed in</li>
            <li>Collecting anonymous usage data via our analytics provider (Amplitude)</li>
          </ul>
          <p className="mb-4">
            You can instruct your browser to refuse all cookies or to indicate when a cookie is
            being sent. However, if you do not accept cookies, you may not be able to use some
            portions of our service.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="mb-4">Disclosure of Your Information</h2>
          <p className="mb-4">We may share your information in the following situations:</p>
          <ul className="list-disc ml-8 mb-4">
            <li>
              <strong>To provide features:</strong> Public content is shown to visitors; hosting,
              analytics and integration providers process the information described above to operate
              their respective features.
            </li>
            <li>
              <strong>With your consent:</strong> We may disclose your information when you have
              given us permission to do so.
            </li>
            <li>
              <strong>For legal reasons:</strong> We may disclose your information if required to do
              so by law or in response to valid requests by public authorities.
            </li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="mb-4">Data Security</h2>
          <p className="mb-4">
            We implement appropriate technical and organizational security measures to protect your
            information from unauthorized access, disclosure, alteration, and destruction. However,
            no method of transmission over the Internet or electronic storage is 100% secure, and we
            cannot guarantee absolute security.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="mb-4">Your Data Protection Rights</h2>
          <p className="mb-4">
            Depending on your location, you may have certain rights regarding your personal
            information, such as:
          </p>
          <ul className="list-disc ml-8 mb-4">
            <li>The right to access the personal information we have about you</li>
            <li>The right to request correction of inaccurate information</li>
            <li>The right to request deletion of your personal information</li>
            <li>The right to object to processing of your personal information</li>
            <li>The right to data portability</li>
            <li>The right to withdraw consent</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="mb-4">Changes to This Privacy Policy</h2>
          <p className="mb-4">
            We may update our Privacy Policy from time to time. We will notify you of any changes by
            posting the new Privacy Policy on this page and updating the "Last updated" date.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="mb-4">Contact Us</h2>
          <p className="mb-4">
            If you have questions about this Privacy Policy or want to request access, correction or
            deletion of your data, contact{' '}
            <a className="underline" href="mailto:info@swubase.com">
              info@swubase.com
            </a>
            .
          </p>
        </section>
      </div>
    </>
  );
}
