import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './routes/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';
import ErrorBoundary from './components/ui/ErrorBoundary';

import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Assistant from './pages/Assistant';
import Appointments from './pages/Appointments';
import AppointmentDetails from './pages/AppointmentDetails';
import Profile from './pages/Profile';
import ChangePassword from './pages/ChangePassword';

function AuthedLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <AppLayout>{children}</AppLayout>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Protected routes */}
            <Route path="/dashboard" element={<AuthedLayout><Dashboard /></AuthedLayout>} />
            <Route path="/assistant" element={<AuthedLayout><Assistant /></AuthedLayout>} />
            <Route path="/doctors" element={<Navigate to="/assistant" replace />} />
            <Route path="/appointments" element={<AuthedLayout><Appointments /></AuthedLayout>} />
            <Route path="/appointments/:id" element={<AuthedLayout><AppointmentDetails /></AuthedLayout>} />
            <Route path="/profile" element={<AuthedLayout><Profile /></AuthedLayout>} />
            <Route path="/change-password" element={<AuthedLayout><ChangePassword /></AuthedLayout>} />

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}
