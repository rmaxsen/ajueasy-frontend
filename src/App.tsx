import { Routes, Route, Navigate } from 'react-router-dom'
import { Suspense, lazy } from 'react'

import { AppLayout } from '@/components/layout/AppLayout'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { useAuthStore } from '@/store/auth'

// Pages — lazy loaded
const LandingPage = lazy(() => import('@/pages/Landing'))
const LoginPage = lazy(() => import('@/pages/Auth/LoginPage'))
const RegisterPage = lazy(() => import('@/pages/Auth/RegisterPage'))
const ResetPasswordPage = lazy(() => import('@/pages/Auth/ResetPasswordPage'))
const OnboardingPage = lazy(() => import('@/pages/Onboarding'))
const SearchPage = lazy(() => import('@/pages/Search'))
const LawyerProfilePage = lazy(() => import('@/pages/LawyerProfile'))
const FeedPage = lazy(() => import('@/pages/Feed'))
const MarketplacePage = lazy(() => import('@/pages/Marketplace'))
const DemandDetailPage = lazy(() => import('@/pages/Marketplace/DemandDetail'))
const ContractsPage = lazy(() => import('@/pages/Contracts'))
const ReviewPage = lazy(() => import('@/pages/Review'))
const CorrespondentsPage = lazy(() => import('@/pages/Correspondents'))
const DashboardPage = lazy(() => import('@/pages/Dashboard'))
const OfficePage = lazy(() => import('@/pages/Office'))
const AdminPage = lazy(() => import('@/pages/Admin'))
const FAQPage = lazy(() => import('@/pages/Institutional/FAQPage'))
const TermsPage = lazy(() => import('@/pages/Institutional/TermsPage'))
const PrivacyPage = lazy(() => import('@/pages/Institutional/PrivacyPage'))
const TrustPage = lazy(() => import('@/pages/Institutional/TrustPage'))

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Auth routes */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/cadastro" element={<RegisterPage />} />
          <Route path="/recuperar-senha" element={<ResetPasswordPage />} />
        </Route>

        {/* Onboarding — auth required, no main layout */}
        <Route
          path="/onboarding"
          element={
            <PrivateRoute>
              <OnboardingPage />
            </PrivateRoute>
          }
        />

        {/* Main app routes */}
        <Route element={<AppLayout />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/buscar" element={<SearchPage />} />
          <Route path="/advogado/:id" element={<LawyerProfilePage />} />
          <Route path="/feed" element={<FeedPage />} />
          <Route path="/marketplace" element={<MarketplacePage />} />
          <Route path="/marketplace/:id" element={<DemandDetailPage />} />
          <Route path="/correspondentes" element={<CorrespondentsPage />} />

          {/* Institutional */}
          <Route path="/faq" element={<FAQPage />} />
          <Route path="/termos" element={<TermsPage />} />
          <Route path="/privacidade" element={<PrivacyPage />} />
          <Route path="/seguranca" element={<TrustPage />} />

          {/* Protected routes */}
          <Route
            path="/dashboard"
            element={<PrivateRoute><DashboardPage /></PrivateRoute>}
          />
          <Route
            path="/contratos"
            element={<PrivateRoute><ContractsPage /></PrivateRoute>}
          />
          <Route
            path="/avaliar/:contractId"
            element={<PrivateRoute><ReviewPage /></PrivateRoute>}
          />
          <Route
            path="/escritorio"
            element={<PrivateRoute><OfficePage /></PrivateRoute>}
          />
          <Route
            path="/admin"
            element={<PrivateRoute><AdminPage /></PrivateRoute>}
          />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
