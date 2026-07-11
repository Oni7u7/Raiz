import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function Home() {
  const { session, profile } = useAuth()

  const dashboardHref =
    session && profile
      ? profile.role === 'anfitrion'
        ? '/dashboard/anfitrion'
        : '/dashboard/participante'
      : null

  return (
    <div className="home-page">
      <section className="home-hero">
        <img src="/img/roots-hero.jpg" alt="Raíces entrelazadas bajo la luz del bosque" />
        <div className="home-hero-scrim" />
        <div className="home-hero-inner">
          <span className="kicker">Ciudad de México · Experiencias de un día</span>
          <h1>
            La ciudad
            <br />
            <em>debajo</em> de la ciudad.
          </h1>
          <p className="lede">
            Recreo son experiencias de un día en la Ciudad de México, en grupos pequeños, guiadas
            por la gente que vive y trabaja en cada lugar.
          </p>
          <div className="home-hero-actions">
            <Link to="/eventos" className="btn btn-solid">
              Ver eventos
            </Link>
            {dashboardHref ? (
              <Link to={dashboardHref} className="btn btn-ghost">
                Mi dashboard
              </Link>
            ) : (
              <Link to="/registro" className="btn btn-ghost">
                Crear cuenta
              </Link>
            )}
          </div>
        </div>
      </section>

      <section className="home-steps">
        <span className="kicker">Cómo funciona</span>
        <div className="steps-grid">
          <div className="step">
            <span className="step-n">01</span>
            <h3>Explora</h3>
            <p>Mira los eventos publicados por nuestros anfitriones, en grupos pequeños.</p>
          </div>
          <div className="step">
            <span className="step-n">02</span>
            <h3>Reserva</h3>
            <p>Aparta tu lugar y cuéntanos si tienes alguna restricción o necesidad de acceso.</p>
          </div>
          <div className="step">
            <span className="step-n">03</span>
            <h3>Vive la experiencia</h3>
            <p>Te lleva la gente que de verdad habita cada lugar — no quienes lo venden.</p>
          </div>
        </div>
      </section>

      <section className="home-strip">
        <div className="frame">
          <img src="/img/comm-bag.jpg" alt="Lista para partir en grupo pequeño" />
        </div>
        <div className="frame">
          <img src="/img/exp-fluidos.jpg" alt="Detalle de una experiencia Recreo" />
        </div>
        <p className="caption">Grupos pequeños, gente real, cada experiencia distinta.</p>
      </section>

      <section className="home-gallery">
        <div className="gallery-item">
          <img src="/img/exp-mesa.jpg" alt="Mesa compartida durante una experiencia Recreo" />
          <div>
            <h3>Para participantes</h3>
            <p>Regístrate, elige tu evento y guarda tus restricciones dietéticas o de accesibilidad una sola vez.</p>
            <Link to="/registro" className="btn btn-ghost">
              Registrarme como participante
            </Link>
          </div>
        </div>
        <div className="gallery-item reverse">
          <img src="/img/exp-aguas.jpg" alt="Experiencia guiada junto al agua" />
          <div>
            <h3>Para anfitriones</h3>
            <p>Publica tus eventos, gestiona reservas y conoce a quienes te dejan una review.</p>
            <Link to="/registro" className="btn btn-ghost">
              Registrarme como anfitrión
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
