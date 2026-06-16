import Navbar from './Navbar.jsx';

export default function PageLayout({ children, className = '' }) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <main className={`flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 ${className}`}>
        {children}
      </main>
      <footer className="border-t border-gray-200 bg-white py-4 text-center text-xs text-gray-400">
        © {new Date().getFullYear()} RideWave — Safe, Reliable Rides
      </footer>
    </div>
  );
}