import { Link } from 'react-router-dom';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext.jsx';

/**
 * LegalPageLayout — standalone layout for public legal documents.
 *
 * Deliberately does NOT render <Navbar />. Terms/Privacy must be readable
 * by anyone (including users who aren't logged in, or are mid-signup) with
 * zero authenticated navigation, dashboard links, or app chrome — just the
 * logo, the document, and a way back. It does include its own minimal
 * dark mode toggle since it can't rely on Navbar for that.
 */
export default function LegalPageLayout({ children }) {
  const { isDark, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-brand-50 to-blue-50
      dark:from-surface-dark dark:to-surface-dark">
      <header className="border-b border-gray-100 dark:border-gray-800 bg-white/80 dark:bg-surface-dark-raised/80 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <img src="/logo.png" alt="RideWave Logo" className="h-8 w-8 object-contain" />
            <div>
              <span className="text-lg font-bold text-gray-900 dark:text-gray-100">Ride</span>
              <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">Wave</span>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              role="switch"
              aria-checked={isDark}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              className="relative p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <Sun  className={`h-4 w-4 text-amber-500 transition-all duration-200 ${isDark ? 'scale-0 -rotate-90 absolute' : 'scale-100 rotate-0'}`} />
              <Moon className={`h-4 w-4 text-indigo-400 transition-all duration-200 ${isDark ? 'scale-100 rotate-0' : 'scale-0 rotate-90 absolute'}`} />
            </button>
            <Link to="/login" className="text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
              Back to login
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="card p-6 sm:p-8">
          {children}
        </div>
      </main>

      <footer className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-surface-dark-raised
        py-4 text-center text-xs text-gray-400 dark:text-gray-500">
        © {new Date().getFullYear()} RideWave — Safe, Reliable Rides
      </footer>
    </div>
  );
}