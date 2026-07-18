import Navbar from './Navbar.jsx';

export default function PageLayout({ children, className = '' }) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-surface-dark">
      <Navbar />
      <main className={`flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 ${className}`}>
        {children}
      </main>
      <footer className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-surface-dark-raised
        py-4 text-center text-xs text-gray-400 dark:text-gray-500">
        © {new Date().getFullYear()} RideWave — Safe, Reliable Rides
      </footer>
    </div>
  );
}