import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import BusinessesPage from './pages/BusinessesPage';
import BusinessDetailPage from './pages/BusinessDetailPage';
import AddBusinessPage from './pages/AddBusinessPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        } />
        <Route path="/businesses" element={
          <ProtectedRoute>
            <BusinessesPage />
          </ProtectedRoute>
        } />
        <Route path="/businesses/:id" element={
          <ProtectedRoute>
            <BusinessDetailPage />
          </ProtectedRoute>
        } />
        <Route path="/businesses/add" element={
          <ProtectedRoute>
            <AddBusinessPage />
          </ProtectedRoute>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}