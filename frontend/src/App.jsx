import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { useAuth } from './hooks/useAuth'
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute'
import ChatWidget from './components/ChatWidget/ChatWidget'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import Forecast from './pages/Forecast'
import Login from './pages/Login'
import Unauthorized from './pages/Unauthorized'

/**
 * ChatWidget is only shown when the user is authenticated.
 * Must be rendered inside <AuthProvider> so useAuth() works.
 */
function AuthenticatedChatWidget() {
  const { user } = useAuth()
  if (!user) return null
  return <ChatWidget />
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          {/* Protected routes — any authenticated user */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/forecast"
            element={
              <ProtectedRoute>
                <Forecast />
              </ProtectedRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Home />} />
        </Routes>

        {/* Floating AI assistant — rendered for authenticated users on all pages */}
        <AuthenticatedChatWidget />
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
