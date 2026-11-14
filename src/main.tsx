import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import { getBasename } from './lib/router'
import { initInstallPrompt } from './pwa/installPrompt'
import { setNeedRefresh } from './pwa/pwaStore'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { networkMode: 'always' },
    mutations: { networkMode: 'always' },
  },
})

initInstallPrompt()

const updateSW = registerSW({
  onNeedRefresh() {
    setNeedRefresh(updateSW)
  },
  onRegisteredSW(_swUrl, registration) {
    if (!registration) return

    window.setInterval(() => {
      void registration.update()
    }, 60 * 60 * 1000)
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename={getBasename(import.meta.env.BASE_URL)}>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
