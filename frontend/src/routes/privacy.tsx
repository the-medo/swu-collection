import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/privacy')({
  component: PrivacyPolicy,
});

function PrivacyPolicy() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <h1 className="mb-6 flex items-center justify-between">
        Privacy policy <span className="text-xs">(updated 2025-03-16)</span>
      </h1>

      <section className="mb-8">
        <h2 className="mb-4">Introduction</h2>
        <p className="mb-4">
          SWU Base ("we", "our", or "us") is committed to protecting your privacy. This Privacy
          Policy explains how we collect, use, disclose, and safeguard your information when you use
          our website and services.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-4">Information We Collect</h2>
        <h3 className="mb-2">Personal Information</h3>
        <p className="mb-4">
          We may collect personal information that you voluntarily provide when creating an account
          or using our services, including:
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
          We do NOT collect information about how you access and use our services.
        </p>

        <h3 className="mb-2">User Content</h3>
        <p className="mb-4">
          We collect and store the content you create, upload, or receive from others when using our
          services, such as:
        </p>
        <ul className="list-disc ml-8 mb-4">
          <li>Collection information</li>
          <li>Deck lists</li>
          <li>Wantlists</li>
          <li>Comments and messages</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="mb-4">How We Use Your Information</h2>
        <p className="mb-4">
          We may use the information we collect for various purposes, including:
        </p>
        <ul className="list-disc ml-8 mb-4">
          <li>Providing and maintaining our services</li>
          <li>Improving our website and services</li>
          <li>Communicating with you about updates or changes</li>
          <li>Detecting and preventing fraudulent or unauthorized activities</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="mb-4">Cookies and Tracking Technologies</h2>
        <p className="mb-4">
          We use cookies and similar tracking technologies to hold certain information. Cookies are
          files with a small amount of data that may include an anonymous unique identifier.
        </p>
        <p className="mb-4">We use cookies for:</p>
        <ul className="list-disc ml-8 mb-4">
          <li>Keeping you signed in</li>
        </ul>
        <p className="mb-4">
          You can instruct your browser to refuse all cookies or to indicate when a cookie is being
          sent. However, if you do not accept cookies, you may not be able to use some portions of
          our service.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-4">Disclosure of Your Information</h2>
        <p className="mb-4">We may share your information in the following situations:</p>
        <ul className="list-disc ml-8 mb-4">
          <li>
            <strong>With your consent:</strong> We may disclose your information when you have given
            us permission to do so.
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
          information from unauthorized access, disclosure, alteration, and destruction. However, no
          method of transmission over the Internet or electronic storage is 100% secure, and we
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
          If you have any questions about this Privacy Policy, please contact us at [
          info@swubase.com ].
        </p>
      </section>
    </div>
  );
}
