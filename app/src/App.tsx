import { Navigate, Route, Routes } from 'react-router-dom'
import { Nav } from './components/Nav'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Home } from './pages/Home'
import { Login } from './pages/Login'
import { Register } from './pages/Register'
import { Events } from './pages/Events'
import { EventDetail } from './pages/EventDetail'
import { ParticipantDashboard } from './pages/dashboard/ParticipantDashboard'
import { HostDashboard } from './pages/dashboard/HostDashboard'
import { EventForm } from './pages/dashboard/EventForm'

export function App() {
  return (
    <>
      <Nav />
      <main className="app-main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/registro" element={<Register />} />
          <Route path="/eventos" element={<Events />} />
          <Route path="/eventos/:id" element={<EventDetail />} />

          <Route element={<ProtectedRoute role="participante" />}>
            <Route path="/dashboard/participante" element={<ParticipantDashboard />} />
          </Route>

          <Route element={<ProtectedRoute role="anfitrion" />}>
            <Route path="/dashboard/anfitrion" element={<HostDashboard />} />
            <Route path="/dashboard/anfitrion/eventos/nuevo" element={<EventForm />} />
            <Route path="/dashboard/anfitrion/eventos/:id/editar" element={<EventForm />} />
          </Route>

          <Route path="*" element={<Navigate to="/eventos" replace />} />
        </Routes>
      </main>
    </>
  )
}
