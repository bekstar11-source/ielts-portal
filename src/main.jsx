import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css' // Agar css bo'lsa
import { BrowserRouter } from 'react-router-dom' // 🔥 MUHIM: Routerni import qiling
import { AuthProvider } from './context/AuthContext'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { LanguageProvider } from './context/LanguageContext'

// Handle chunk loading errors (usually happens after a new deployment)
window.addEventListener('vite:preloadError', (event) => {
  // Reload the page to fetch the new scripts
  window.location.reload()
})

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      cacheTime: 1000 * 60 * 30, // 30 minutes
      refetchOnWindowFocus: false,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* 🔥 Ilovani BrowserRouter ichiga olish SHART */}
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <LanguageProvider>
            <App />
          </LanguageProvider>
        </AuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </React.StrictMode>,
)