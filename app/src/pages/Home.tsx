import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { supabase } from '../lib/supabaseClient'
import { accessibilityLabel } from '../i18n/labels'
import { RootsBackground } from '../components/RootsBackground'
import type { Database } from '../types/database'

type EventRow = Database['public']['Tables']['events']['Row'] & {
  hosts: { business_name: string | null } | null
}

export function Home() {
  const { session, profile } = useAuth()
  const { t, language } = useLanguage()
  const [upcomingEvents, setUpcomingEvents] = useState<EventRow[]>([])
  const [loadingEvents, setLoadingEvents] = useState(true)

  useEffect(() => {
    let active = true

    supabase
      .from('events')
      .select('*, hosts(business_name)')
      .eq('status', 'publicado')
      .gte('start_date', new Date().toISOString())
      .order('start_date', { ascending: true })
      .limit(3)
      .then(({ data, error }) => {
        if (!active) return
        if (!error) setUpcomingEvents((data ?? []) as EventRow[])
        setLoadingEvents(false)
      })

    return () => {
      active = false
    }
  }, [])

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
          <span className="kicker">{t.home.hero.kicker}</span>
          <h1>
            {t.home.hero.titleLine1}
            <br />
            <em>{t.home.hero.titleEm}</em> {t.home.hero.titleRest}
          </h1>
          <p className="lede">{t.home.hero.lede}</p>
          <div className="home-hero-actions">
            <Link to="/eventos" className="btn btn-solid">
              {t.home.hero.ctaEvents}
            </Link>
            {dashboardHref ? (
              <Link to={dashboardHref} className="btn btn-ghost">
                {t.home.hero.ctaDashboard}
              </Link>
            ) : (
              <Link to="/registro" className="btn btn-ghost">
                {t.home.hero.ctaCreateAccount}
              </Link>
            )}
          </div>
        </div>
      </section>

      <div className="home-middle">
        <RootsBackground />

        <section className="home-upcoming">
          <div className="masthead">
            <div className="mh-l">
              <span className="kicker">{t.home.upcoming.kicker}</span>
              <h2>{t.home.upcoming.title}</h2>
            </div>
            <Link to="/eventos" className="map-link">
              {t.home.upcoming.viewAll}
            </Link>
          </div>

          {loadingEvents && <p className="loading">{t.common.loading}</p>}

          {!loadingEvents && upcomingEvents.length === 0 && (
            <p className="lede">
              {t.home.upcoming.empty} <Link to="/eventos">{t.home.upcoming.emptyLink}</Link>.
            </p>
          )}

          {upcomingEvents.length > 0 && (
            <ul className="events-list">
              {upcomingEvents.map((event) => (
                <li key={event.id}>
                  <Link to={`/eventos/${event.id}`} className="card-link">
                    <h2>{event.title}</h2>
                    <p>
                      {new Date(event.start_date).toLocaleString(language === 'en' ? 'en-US' : 'es-MX')}
                      {event.location ? ` · ${event.location}` : ''}
                    </p>
                    {event.hosts?.business_name && <p className="host-name">{event.hosts.business_name}</p>}
                    {event.accessibility_features.length > 0 && (
                      <div className="chips">
                        {event.accessibility_features.map((f) => (
                          <span key={f} className="chip">
                            {accessibilityLabel(f, language)}
                          </span>
                        ))}
                      </div>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="home-steps">
          <span className="kicker">{t.home.steps.kicker}</span>
          <div className="steps-grid">
            <div className="step">
              <span className="step-n">01</span>
              <h3>{t.home.steps.step1Title}</h3>
              <p>{t.home.steps.step1Body}</p>
            </div>
            <div className="step">
              <span className="step-n">02</span>
              <h3>{t.home.steps.step2Title}</h3>
              <p>{t.home.steps.step2Body}</p>
            </div>
            <div className="step">
              <span className="step-n">03</span>
              <h3>{t.home.steps.step3Title}</h3>
              <p>{t.home.steps.step3Body}</p>
            </div>
          </div>
        </section>

        <section className="home-steps">
          <span className="kicker">{t.home.why.kicker}</span>
          <div className="steps-grid">
            <div className="step">
              <span className="step-n">04</span>
              <h3>{t.home.why.item1Title}</h3>
              <p>{t.home.why.item1Body}</p>
            </div>
            <div className="step">
              <span className="step-n">05</span>
              <h3>{t.home.why.item2Title}</h3>
              <p>{t.home.why.item2Body}</p>
            </div>
            <div className="step">
              <span className="step-n">06</span>
              <h3>{t.home.why.item3Title}</h3>
              <p>{t.home.why.item3Body}</p>
            </div>
          </div>
        </section>

        <section className="home-stats">
          <div className="stats-grid">
            <div className="stat">
              <span className="stat-value">{t.home.stats.groupValue}</span>
              <p>{t.home.stats.groupLabel}</p>
            </div>
            <div className="stat">
              <span className="stat-value">{t.home.stats.hostValue}</span>
              <p>{t.home.stats.hostLabel}</p>
            </div>
            <div className="stat">
              <span className="stat-value">{t.home.stats.dayValue}</span>
              <p>{t.home.stats.dayLabel}</p>
            </div>
          </div>
        </section>

        <section className="home-manifesto">
          <div className="masthead">
            <div className="mh-l">
              <span className="kicker">{t.home.manifesto.kicker}</span>
              <h2>{t.home.manifesto.title}</h2>
            </div>
          </div>
          <div className="manifesto-grid">
            <div className="manifesto-item">
              <h3>{t.home.manifesto.item1Title}</h3>
              <p>{t.home.manifesto.item1Body}</p>
            </div>
            <div className="manifesto-item">
              <h3>{t.home.manifesto.item2Title}</h3>
              <p>{t.home.manifesto.item2Body}</p>
            </div>
            <div className="manifesto-item">
              <h3>{t.home.manifesto.item3Title}</h3>
              <p>{t.home.manifesto.item3Body}</p>
            </div>
            <div className="manifesto-item">
              <h3>{t.home.manifesto.item4Title}</h3>
              <p>{t.home.manifesto.item4Body}</p>
            </div>
          </div>
        </section>
      </div>

      <section className="home-strip">
        <div className="frame">
          <img src="/img/comm-bag.jpg" alt="Lista para partir en grupo pequeño" />
        </div>
        <div className="frame">
          <img src="/img/exp-fluidos.jpg" alt="Detalle de una experiencia Recreo" />
        </div>
        <p className="caption">{t.home.strip.caption}</p>
      </section>

      <section className="home-gallery">
        <div className="gallery-item">
          <img src="/img/exp-mesa.jpg" alt="Mesa compartida durante una experiencia Recreo" />
          <div>
            <h3>{t.home.gallery.participantTitle}</h3>
            <p>{t.home.gallery.participantBody}</p>
            <Link to="/registro" className="btn btn-ghost">
              {t.home.gallery.participantCta}
            </Link>
          </div>
        </div>
        <div className="gallery-item reverse">
          <img src="/img/exp-aguas.jpg" alt="Experiencia guiada junto al agua" />
          <div>
            <h3>{t.home.gallery.hostTitle}</h3>
            <p>{t.home.gallery.hostBody}</p>
            <Link to="/registro" className="btn btn-ghost">
              {t.home.gallery.hostCta}
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
