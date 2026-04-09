import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { Questions } from './pages/admin/Questions';
import { CreateQuestion } from './pages/admin/CreateQuestion';
import { Assessments } from './pages/admin/Assessments';
import { Settings } from './pages/admin/Settings';

import { Practice } from './pages/candidate/Practice';
import { PracticeProblem } from './pages/candidate/PracticeProblem';
import { Submissions } from './pages/candidate/Submissions';

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen bg-slate-950 text-slate-400">Loading…</div>;
  return user ? <>{children}</> : <Navigate to="/login" />;
};

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen bg-slate-950 text-slate-400">Loading…</div>;
  if (!user) return <Navigate to="/login" />;
  if (user.role !== 'admin') return <Navigate to="/" />;
  return <>{children}</>;
};

function AppRoutes() {
  const { user } = useAuth();

  return (
    <>
      {user && <Navbar />}
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
        <Route path="/register" element={user ? <Navigate to="/" /> : <Register />} />
        <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />

        <Route path="/admin/questions" element={<AdminRoute><Questions /></AdminRoute>} />
        <Route path="/admin/questions/create" element={<AdminRoute><CreateQuestion /></AdminRoute>} />
        <Route path="/admin/questions/:id/edit" element={<AdminRoute><CreateQuestion /></AdminRoute>} />
        <Route path="/admin/assessments" element={<AdminRoute><Assessments /></AdminRoute>} />
        <Route path="/admin/assessments/create" element={<Navigate to="/admin/assessments" replace />} />
        <Route path="/admin/settings" element={<AdminRoute><Settings /></AdminRoute>} />


        <Route path="/assessments" element={<PrivateRoute><Navigate to="/" replace /></PrivateRoute>} />
        <Route path="/assessment/:id/start" element={<Navigate to="/" replace />} />
        <Route path="/assessment/:id/continue" element={<Navigate to="/" replace />} />
        <Route path="/practice" element={<PrivateRoute><Practice /></PrivateRoute>} />
        <Route path="/practice/:id" element={<PrivateRoute><PracticeProblem /></PrivateRoute>} />
        <Route path="/submissions" element={<PrivateRoute><Submissions /></PrivateRoute>} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
