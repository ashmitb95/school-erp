import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import Layout from './components/Layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Students from './pages/Students';
import StudentDetail from './pages/Students/StudentDetail';
import Fees from './pages/Fees';
import Attendance from './pages/Attendance';
import Exams from './pages/Exams';
import ExamDetail from './pages/Exams/ExamDetail';
import AIChat from './pages/AIChat';
import Settings from './pages/Settings';
import Payment from './pages/Payment/Payment';

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/pay/:id" element={<Payment />} />
        <Route
          path="/*"
          element={
            <PrivateRoute>
              <Layout>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/students" element={<Students />} />
                  <Route path="/students/:id" element={<StudentDetail />} />
                  <Route path="/fees" element={<Fees />} />
                  <Route path="/attendance" element={<Attendance />} />
                  <Route path="/exams" element={<Exams />} />
                  <Route path="/exams/:id" element={<ExamDetail />} />
                  <Route path="/ai" element={<AIChat />} />
                  <Route path="/settings" element={<Settings />} />
                </Routes>
              </Layout>
            </PrivateRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
};

export default App;


