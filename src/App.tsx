import type { ReactNode } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { LoginPage } from './features/auth/LoginPage'
import { SignupPage } from './features/auth/SignupPage'
import { LibraryPage } from './features/library/LibraryPage'
import { SetDetailPage } from './features/library/SetDetailPage'
import { MarksPage } from './features/marks/MarksPage'
import { NotFoundPage } from './features/NotFoundPage'
import { PracticePage } from './features/practice/PracticePage'
import { ResultsPage } from './features/practice/ResultsPage'
import { SettingsPage } from './features/settings/SettingsPage'
import { StatsPage } from './features/stats/StatsPage'
import { MockStoreProvider, useMockStore } from './lib/mockStore'

function RequireAuth({ children }: { children: ReactNode }) {
  const { user } = useMockStore()
  const location = useLocation()

  if (!user) {
    return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />
  }

  return children
}

export default function App() {
  return (
    <MockStoreProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/auth/callback" element={<Navigate to="/" replace />} />

        <Route
          element={
            <RequireAuth>
              <AppShell />
            </RequireAuth>
          }
        >
          <Route path="/" element={<LibraryPage />} />
          <Route path="/sets/:setId" element={<SetDetailPage />} />
          <Route path="/practice/:sessionId" element={<PracticePage />} />
          <Route path="/results/:sessionId" element={<ResultsPage />} />
          <Route path="/marks" element={<MarksPage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </MockStoreProvider>
  )
}
