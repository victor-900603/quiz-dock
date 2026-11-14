import { AppRoutes } from './AppRoutes'
import { AuthProvider } from './features/auth/AuthProvider'
import { UpdatePrompt } from './pwa/UpdatePrompt'

export default function App() {
  return (
    <>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
      <UpdatePrompt />
    </>
  )
}
