import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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

// New Advanced Feature Pages
import { MedicalRecordsPage } from './pages/MedicalRecordsPage.js';
import { TeleconsultDirectoryPage } from './pages/TeleconsultDirectoryPage.js';
import { ConsultationRoomPage } from './pages/ConsultationRoomPage.js';
import { AIReportExplainerPage } from './pages/AIReportExplainerPage.js';
import { HospitalResourcesPage } from './pages/HospitalResourcesPage.js';
import { InsuranceAssistancePage } from './pages/InsuranceAssistancePage.js';
import { IndoorNavigationPage } from './pages/IndoorNavigationPage.js';

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

                {/* Advanced Features (Features 1 to 9) */}
                <Route path="/teleconsult" element={<TeleconsultDirectoryPage />} />
                <Route
                  path="/consultations/room/:roomId"
                  element={
                    <ProtectedRoute>
                      <ConsultationRoomPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/records"
                  element={
                    <ProtectedRoute allowedRoles={['patient', 'doctor', 'admin', 'hospital_admin', 'superadmin']}>
                      <MedicalRecordsPage />
                    </ProtectedRoute>
                  }
                />
                <Route path="/ai-report-explainer" element={<AIReportExplainerPage />} />
                <Route path="/insurance" element={<InsuranceAssistancePage />} />
                <Route path="/resources" element={<Navigate to="/" replace />} />
                <Route path="/indoor-navigation" element={<Navigate to="/" replace />} />

                {/* Role Protected Dashboard Routes */}
                <Route
                  path="/dashboard/patient"
                  element={
                    <ProtectedRoute allowedRoles={['patient', 'admin', 'superadmin']}>
                      <PatientDashboardPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/doctor"
                  element={
                    <ProtectedRoute allowedRoles={['doctor', 'admin', 'superadmin']}>
                      <DoctorDashboardPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/admin"
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'hospital_admin', 'superadmin']}>
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
