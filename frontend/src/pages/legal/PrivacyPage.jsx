import LegalPageLayout from '../../components/common/LegalPageLayout.jsx';

const LAST_UPDATED = 'June 16, 2026';

export default function PrivacyPage() {
  return (
    <LegalPageLayout>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Privacy Policy</h1>
      <p className="text-sm text-gray-400 mb-8">Last updated: {LAST_UPDATED}</p>

      <div className="prose prose-sm max-w-none space-y-6 text-gray-700">
        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-2">1. Information We Collect</h2>
          <p>
            When you register, we collect your full name, email address, phone number, and a
            hashed password. Drivers additionally submit a profile photo, driving license,
            vehicle registration, and vehicle details for verification purposes.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-2">2. How We Use Your Information</h2>
          <p>
            We use your information to operate the platform: matching drivers with passengers,
            processing bookings and payments, verifying driver documents, sending notifications
            about your rides, and maintaining account security.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-2">3. Document Verification Data</h2>
          <p>
            Driving license and vehicle registration images are processed using optical
            character recognition to extract identifying information and verify authenticity.
            Extracted text, verification scores, and any flags raised during this process are
            retained for the duration of your account and may be reviewed by an administrator
            if automated checks cannot confidently approve your documents.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-2">4. Location Data</h2>
          <p>
            With your permission, we collect GPS coordinates to support pickup verification and
            to display ride routes on the map. Location data is only collected while actively
            using ride-related features.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-2">5. Information Sharing</h2>
          <p>
            Your name, profile photo, and trust score are visible to other users when relevant
            to a ride (e.g. a passenger can see their driver's name and rating). We do not sell
            your personal information to third parties. Limited information may be shared with
            service providers that help us operate the platform, such as SMS and email delivery
            services.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-2">6. Data Retention</h2>
          <p>
            We retain your account information for as long as your account is active. If you
            delete your account, we retain transaction records as required for legal and
            accounting purposes, but remove personally identifying information where possible.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-2">7. Your Rights</h2>
          <p>
            You may request a copy of the personal data we hold about you, request corrections,
            or request deletion of your account, subject to legal and operational requirements.
            Contact support through the Help section to make a request.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-2">8. Security</h2>
          <p>
            Passwords are stored using industry-standard hashing. Document images and
            verification data are stored securely and access is restricted to administrators
            performing verification review.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-2">9. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. Material changes may require
            existing users to re-acknowledge the updated policy.
          </p>
        </section>
      </div>
    </LegalPageLayout>
  );
}