import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import Layout from './components/Layout/Layout';
import Landing from './pages/Landing/Landing';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Students from './pages/Students';
import StudentDetail from './pages/Students/StudentDetail';
import Staff from './pages/Staff/Staff';
import Classes from './pages/Classes/Classes';
import ClassDetail from './pages/Classes/ClassDetail';
import Subjects from './pages/Subjects/Subjects';
import Timetables from './pages/Timetables/Timetables';
import TransportRoutes from './pages/TransportRoutes/TransportRoutes';
import CreateRoute from './pages/TransportRoutes/CreateRoute';
import Calendar from './pages/Calendar/Calendar';
import Fees from './pages/Fees';
import Attendance from './pages/Attendance';
import Exams from './pages/Exams';
import ExamDetail from './pages/Exams/ExamDetail';
import AIChat from './pages/AIChat';
import Settings from './pages/Settings';
import Payment from './pages/Payment/Payment';
import Roles from './pages/RBAC/Roles';
import RoleDetail from './pages/RBAC/RoleDetail';
import StaffRoles from './pages/RBAC/StaffRoles';

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

const App: React.FC = () => {
  const { isAuthenticated } = useAuthStore();
  
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/landing" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/pay/:id" element={<Payment />} />
        <Route
          path="/"
          element={
            isAuthenticated ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <Landing />
            )
          }
        />
        <Route
          path="/*"
          element={
            <PrivateRoute>
              <Layout>
                      <Routes>
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/students" element={<Students />} />
                        <Route path="/students/:id" element={<StudentDetail />} />
                        <Route path="/staff" element={<Staff />} />
                        <Route path="/classes" element={<Classes />} />
                        <Route path="/classes/:id" element={<ClassDetail />} />
                        <Route path="/subjects" element={<Subjects />} />
                        <Route path="/timetables" element={<Timetables />} />
                        <Route path="/transport" element={<TransportRoutes />} />
                        <Route path="/transport/create" element={<CreateRoute />} />
                        <Route path="/transport/edit/:id" element={<CreateRoute />} />
                        <Route path="/calendar" element={<Calendar />} />
                        <Route path="/fees" element={<Fees />} />
                        <Route path="/attendance" element={<Attendance />} />
                        <Route path="/exams" element={<Exams />} />
                        <Route path="/exams/:id" element={<ExamDetail />} />
                        <Route path="/ai" element={<AIChat />} />
                        <Route path="/rbac" element={<Roles />} />
                        <Route path="/rbac/roles" element={<Roles />} />
                        <Route path="/rbac/roles/:id" element={<RoleDetail />} />
                        <Route path="/rbac/staff/:id" element={<StaffRoles />} />
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


