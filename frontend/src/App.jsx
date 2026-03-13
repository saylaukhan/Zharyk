import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import Landing from './pages/Landing'
import StudentApp from './pages/StudentApp'
import Psychologist from './pages/Psychologist'
import DirectorDashboard from './pages/DirectorDashboard'

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/app" element={<StudentApp />} />
          <Route path="/psychologist" element={<Psychologist />} />
          <Route path="/director" element={<DirectorDashboard />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  )
}
