import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function Nav() {
  const { session, profile, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <nav className="app-nav">
      <Link to="/" className="brand">
        Raíz<span className="dot"></span>
      </Link>
      <div className="app-nav-links">
        <Link to="/">Inicio </Link> 
        <Link to="/eventos">Eventos</Link>
        {session && profile?.role === 'participante' && (
          <Link to="/dashboard/participante">Mi dashboard</Link>
        )}
        {session && profile?.role === 'anfitrion' && (
          <Link to="/dashboard/anfitrion">Mi dashboard</Link>
        )}
        {session ? (
          <button type="button" onClick={handleSignOut}>
            Salir
          </button>
        ) : (
          <>
            <Link to="/login">Entrar</Link>
            <Link to="/registro">Registrarme</Link>
          </>
        )}
      </div>
    </nav>
  )
}
