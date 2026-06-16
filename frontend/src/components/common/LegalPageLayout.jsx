import { Link } from 'react-router-dom';

/**
 * LegalPageLayout — standalone layout for public legal documents.
 *
 * Deliberately does NOT render <Navbar />. Terms/Privacy must be readable
 * by anyone (including users who aren't logged in, or are mid-signup) with
 * zero authenticated navigation, dashboard links, or app chrome — just the
 * logo, the document, and a way back.
 */
export default function LegalPageLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-brand-50 to-blue-50">
      <header className="border-b border-gray-100 bg-white/80 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <img src="/logo.png" alt="RideWave Logo" className="h-8 w-8 object-contain" />
            <div>
              <span className="text-lg font-bold text-gray-900">Ride</span>
              <span className="text-lg font-bold text-indigo-600">Wave</span>
            </div>
          </Link>
          <Link to="/login" className="text-sm font-medium text-gray-500 hover:text-gray-700">
            Back to login
          </Link>
        </div>
      </header>

      <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="card p-6 sm:p-8">
          {children}
        </div>
      </main>

      <footer className="border-t border-gray-200 bg-white py-4 text-center text-xs text-gray-400">
        © {new Date().getFullYear()} RideWave — Safe, Reliable Rides
      </footer>
    </div>
  );
}