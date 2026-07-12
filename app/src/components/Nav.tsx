import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'

export function Nav() {
  const { session, profile, signOut } = useAuth()
  const { t, language, setLanguage } = useLanguage()
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
        <Link to="/">{t.nav.inicio}</Link>
        <Link to="/eventos">{t.nav.eventos}</Link>
        {session && profile?.role === 'participante' && (
          <Link to="/dashboard/participante">{t.nav.dashboard}</Link>
        )}
        {session && profile?.role === 'anfitrion' && (
          <Link to="/dashboard/anfitrion">{t.nav.dashboard}</Link>
        )}
        {session ? (
          <button type="button" onClick={handleSignOut}>
            {t.nav.salir}
          </button>
        ) : (
          <>
            <Link to="/login">{t.nav.entrar}</Link>
            <Link to="/registro">{t.nav.registrarme}</Link>
          </>
        )}
        <div className="lang-toggle">
          <button
            type="button"
            className={language === 'es' ? 'lang-active' : ''}
            onClick={() => setLanguage('es')}
          >
            ES
          </button>
          <span>·</span>
          <button
            type="button"
            className={language === 'en' ? 'lang-active' : ''}
            onClick={() => setLanguage('en')}
          >
            EN
          </button>
        </div>
      </div>
    </nav>
  )
}
