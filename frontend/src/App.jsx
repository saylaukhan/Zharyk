import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import OnboardingModal from './components/OnboardingModal'
import Landing from './pages/Landing'
import StudentApp from './pages/StudentApp'
import Psychologist from './pages/Psychologist'
import DirectorDashboard from './pages/DirectorDashboard'
import CourseBuilder from './pages/CourseBuilder'
import CoursePass from './pages/CoursePass'


export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/app" element={
              <ProtectedRoute allowedRoles={['student', 'employee']}>
                <StudentApp />
              </ProtectedRoute>
            } />
            <Route path="/psychologist" element={
              <ProtectedRoute allowedRoles={['psychologist']}>
                <Psychologist />
              </ProtectedRoute>
            } />
            <Route path="/director" element={
              <ProtectedRoute allowedRoles={['director']}>
                <DirectorDashboard />
              </ProtectedRoute>
            } />
            <Route path="/course-builder" element={
              <ProtectedRoute allowedRoles={['psychologist']}>
                <CourseBuilder />
              </ProtectedRoute>
            } />
            <Route path="/course/:id" element={
              <ProtectedRoute allowedRoles={['student', 'employee', 'psychologist', 'director']}>
                <CoursePass />
              </ProtectedRoute>
            } />
            <Route path="/course" element={
              <ProtectedRoute allowedRoles={['student', 'employee', 'psychologist', 'director']}>
                <CoursePass />
              </ProtectedRoute>
            } />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <OnboardingModal />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}
