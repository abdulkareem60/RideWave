import LegalPageLayout from '../../components/common/LegalPageLayout.jsx';

const LAST_UPDATED = 'June 16, 2026';

export default function TermsPage() {
  return (
    <LegalPageLayout>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Terms of Service</h1>
      <p className="text-sm text-gray-400 mb-8">Last updated: {LAST_UPDATED}</p>

      <div className="prose prose-sm max-w-none space-y-6 text-gray-700">
        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-2">1. Acceptance of Terms</h2>
          <p>
            By creating an account on RideWave, you agree to be bound by these Terms of Service.
            If you do not agree to these terms, you must not register for or use the platform.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-2">2. The Service</h2>
          <p>
            RideWave is a ride-sharing platform that connects drivers offering seats on a journey
            with passengers looking to travel the same route. RideWave does not own, operate, or
            control any vehicle and is not a party to the transportation arrangement between
            drivers and passengers.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-2">3. Account Eligibility</h2>
          <p>
            You must be at least 18 years old to register. Drivers must hold a valid driving
            license and vehicle registration for the vehicle they intend to use, and must submit
            these documents for verification before offering rides.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-2">4. Driver Verification</h2>
          <p>
            Driver accounts remain restricted until submitted documents pass automated or manual
            verification. RideWave reserves the right to reject an application, request
            re-submission of documents, or suspend a driver account at its discretion if
            verification cannot be completed satisfactorily.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-2">5. Bookings and Payments</h2>
          <p>
            Fares are set by the driver at the time a ride is created. Passengers agree to pay
            the displayed fare per seat upon booking. Cancellation and refund eligibility depend
            on the timing of the cancellation relative to the scheduled departure.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-2">6. Conduct</h2>
          <p>
            Users agree to treat one another with respect, to provide accurate information about
            themselves and their vehicles, and not to use the platform for any unlawful purpose.
            Violations may result in suspension or termination of an account.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-2">7. Limitation of Liability</h2>
          <p>
            RideWave facilitates introductions between drivers and passengers but is not
            responsible for the conduct of any user, the condition of any vehicle, or the
            outcome of any ride. Use of the platform is at your own risk.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-2">8. Changes to These Terms</h2>
          <p>
            RideWave may update these Terms of Service from time to time. Continued use of the
            platform after a change constitutes acceptance of the revised terms. Material changes
            may require existing users to re-accept the updated terms.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-2">9. Contact</h2>
          <p>
            Questions about these terms can be directed to our support team through the Help
            section of the app.
          </p>
        </section>
      </div>
    </LegalPageLayout>
  );
}