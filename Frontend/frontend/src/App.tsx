import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { AuthProvider } from '@/contexts/AuthContext'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { DashboardLayout } from '@/components/layout/DashboardLayout'

// Public pages
import { CoverPage } from '@/pages/CoverPage'
import { Login } from '@/pages/Login'
import { Register } from '@/pages/Register'

// Role-specific dashboards
import { PatientDashboard } from '@/pages/PatientDashboard'
import { HospitalDashboard } from '@/pages/HospitalDashboard'
import { AdminDashboard } from '@/pages/AdminDashboard'

// Existing pages (for hospital role)
// import { Dashboard } from '@/pages/Dashboard'
import { DemandForecast } from '@/pages/DemandForecast'
import { Triage } from '@/pages/Triage'
import { StaffScheduling } from '@/pages/StaffScheduling'
import { ERORScheduling } from '@/pages/ERORScheduling'
import { DischargePlanning } from '@/pages/DischargePlanning'
import { FederatedLearning } from '@/pages/FederatedLearning'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<CoverPage />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* Patient routes */}
              <Route
                path="/patient/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['patient']}>
                    <DashboardLayout>
                      <PatientDashboard />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />

              {/* Hospital routes - can access all pages */}
              <Route
                path="/hospital/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['hospital']}>
                    <DashboardLayout>
                      <HospitalDashboard />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/hospital/*"
                element={
                  <ProtectedRoute allowedRoles={['hospital']}>
                    <DashboardLayout>
                      <Routes>
                        <Route path="forecast" element={<DemandForecast />} />
                        <Route path="triage" element={<Triage />} />
                        <Route path="staff" element={<StaffScheduling />} />
                        <Route path="er-or" element={<ERORScheduling />} />
                        <Route path="discharge" element={<DischargePlanning />} />
                        <Route path="fl" element={<FederatedLearning />} />
                      </Routes>
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />

              {/* Super Admin routes */}
              <Route
                path="/admin/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['superadmin']}>
                    <DashboardLayout>
                      <AdminDashboard />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/scheduling"
                element={
                  <ProtectedRoute allowedRoles={['superadmin']}>
                    <DashboardLayout>
                      <AdminDashboard />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />

              {/* Legacy routes - redirect based on role */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Navigate to="/patient/dashboard" replace />
                  </ProtectedRoute>
                }
              />

              {/* Catch all */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
          <Toaster position="top-right" />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}

export default App
