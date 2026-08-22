import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import ScanPage from './pages/ScanPage';
import CustomersPage from './pages/CustomersPage';
import CustomerCardPage from './pages/CustomerCardPage';
import StaffPage from './pages/StaffPage';
import SettingsPage from './pages/SettingsPage';
import EnrollPage from './pages/EnrollPage';
import EnrollQRPage from './pages/EnrollQRPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/card/:token" element={<CustomerCardPage />} />

          {/* Protected — business staff only */}
          <Route path="/" element={
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          } />
          <Route path="/scan" element={
            <ProtectedRoute>
              <ScanPage />
            </ProtectedRoute>
          } />
          <Route path="/customers" element={
            <ProtectedRoute>
              <CustomersPage key={Date.now()} />
            </ProtectedRoute>
          } />
          <Route path="/staff" element={
            <ProtectedRoute allowedRoles={['business_owner', 'admin_staff']}>
              <StaffPage />
            </ProtectedRoute>
          } />
          <Route path="/settings" element={
            <ProtectedRoute allowedRoles={['business_owner']}>
              <SettingsPage />
            </ProtectedRoute>
          } />
          {/* Public enrollment page */}
        <Route path="/enroll/:businessId" element={<EnrollPage />} />

        {/* Protected — owner only */}
        <Route path="/enroll-qr" element={
          <ProtectedRoute allowedRoles={['business_owner']}>
            <EnrollQRPage />
          </ProtectedRoute>
        } />
          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}