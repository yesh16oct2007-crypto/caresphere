import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.js';
import { ThemeProvider } from './context/ThemeContext.js';
import { DemonstrationBanner } from './components/DemonstrationBanner.js';
import { EmergencyBanner } from './components/EmergencyBanner.js';
import { Navbar } from './components/Navbar.js';
import { Footer } from './components/Footer.js';
import { LanguageWelcomeModal } from './components/LanguageWelcomeModal.js';
import { AIAssistantModal } from './components/AIAssistantModal.js';
import { ProtectedRoute } from './components/ProtectedRoute.js';

import { HomePage } from './pages/HomePage.js';
import { DoctorDirectoryPage } from './pages/DoctorDirectoryPage.js';
import { DepartmentsPage } from './pages/DepartmentsPage.js';
import { FacilitiesPage } from './pages/FacilitiesPage.js';
import { BookAppointmentPage } from './pages/BookAppointmentPage.js';
import { LoginPage } from './pages/LoginPage.js';
import { RegisterPage } from './pages/RegisterPage.js';
import { PatientDashboardPage } from './pages/PatientDashboardPage.js';
import { DoctorDashboardPage } from './pages/DoctorDashboardPage.js';
import { AdminDashboardPage } from './pages/AdminDashboardPage.js';

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <div className="flex flex-col min-h-screen bg-slate-50 text-slate-800 dark:bg-slate-900 dark:text-slate-100 transition-colors">
            {/* Top Demonstration & Emergency Banners */}
            <DemonstrationBanner />
            <EmergencyBanner />

            {/* Navigation Bar */}
            <Navbar />

            {/* Main Application Routes */}
            <main className="flex-1">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/doctors" element={<DoctorDirectoryPage />} />
                <Route path="/departments" element={<DepartmentsPage />} />
                <Route path="/facilities" element={<FacilitiesPage />} />
                <Route path="/book" element={<BookAppointmentPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />

                {/* Role Protected Dashboard Routes */}
                <Route
                  path="/dashboard/patient"
                  element={
                    <ProtectedRoute allowedRoles={['patient', 'admin']}>
                      <PatientDashboardPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/doctor"
                  element={
                    <ProtectedRoute allowedRoles={['doctor', 'admin']}>
                      <DoctorDashboardPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/admin"
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <AdminDashboardPage />
                    </ProtectedRoute>
                  }
                />

                {/* Fallback to Home */}
                <Route path="*" element={<HomePage />} />
              </Routes>
            </main>

            {/* Global Footer */}
            <Footer />

            {/* First-Visit Multilingual Onboarding Modal */}
            <LanguageWelcomeModal />

            {/* Floating Multilingual AI Assistant Widget */}
            <AIAssistantModal />
          </div>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
