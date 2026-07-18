import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import App from './App.jsx';
import { ThemeProvider, useTheme } from './context/ThemeContext.jsx';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,        // 30 seconds
      refetchOnWindowFocus: false,
    },
  },
});

/**
 * Wraps react-hot-toast's <Toaster>, which renders via a portal and uses
 * inline styles rather than Tailwind classes — it can't pick up `dark:`
 * variants automatically, so it reads the current theme directly here.
 */
function ThemedToaster() {
  const { isDark } = useTheme();
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: {
          fontFamily: 'Inter, sans-serif',
          fontSize: '14px',
          background: isDark ? '#1A1D23' : '#FFFFFF',
          color: isDark ? '#E5E7EB' : '#111827',
          border: `1px solid ${isDark ? '#27272A' : '#E5E7EB'}`,
        },
        success: { iconTheme: { primary: '#2563EB', secondary: '#fff' } },
      }}
    />
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <App />
          <ThemedToaster />
        </QueryClientProvider>
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>
);