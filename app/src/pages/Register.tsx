import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useLanguage } from '../context/LanguageContext'
import type { UserRole } from '../types/database'

export function Register() {
  const { t } = useLanguage()
  const [role, setRole] = useState<UserRole>('participante')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // Campos específicos de anfitrión
  const [businessName, setBusinessName] = useState('')
  const [bio, setBio] = useState('')

  // Campos específicos de participante
  const [emergencyContactName, setEmergencyContactName] = useState('')
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('')

  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [confirmationSent, setConfirmationSent] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/login`,
        data: {
          role,
          full_name: fullName,
          phone: phone || null,
          ...(role === 'anfitrion'
            ? { business_name: businessName || null, bio: bio || null }
            : {
                emergency_contact_name: emergencyContactName || null,
                emergency_contact_phone: emergencyContactPhone || null,
              }),
        },
      },
    })

    setSubmitting(false)

    if (error) {
      setError(error.message)
      return
    }

    setConfirmationSent(true)
  }

  if (confirmationSent) {
    return (
      <div className="auth-split">
        <div className="auth-media">
          <img src="/img/exp-mesa.jpg" alt="Mesa compartida durante una experiencia Recreo" />
        </div>
        <div className="auth-page">
          <div className="form-card">
            <span className="kicker">Raíz</span>
            <h1>{t.register.confirmTitle}</h1>
            <p>
              {t.register.confirmBodyPre} <strong>{email}</strong>
              {t.register.confirmBodyPost}
            </p>
            <Link to="/login">{t.register.goLogin}</Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-split">
      <div className="auth-media">
        <img src="/img/exp-mesa.jpg" alt="Mesa compartida durante una experiencia Recreo" />
      </div>
      <div className="auth-page">
        <div className="form-card">
          <span className="kicker">Raíz</span>
          <h1>{t.register.title}</h1>
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label>{t.register.roleLabel}</label>
              <div className="field-radios">
                <label>
                  <input
                    type="radio"
                    name="role"
                    checked={role === 'participante'}
                    onChange={() => setRole('participante')}
                  />
                  {t.register.roleParticipant}
                </label>
                <label>
                  <input
                    type="radio"
                    name="role"
                    checked={role === 'anfitrion'}
                    onChange={() => setRole('anfitrion')}
                  />
                  {t.register.roleHost}
                </label>
              </div>
            </div>

            <div className="field">
              <label htmlFor="fullName">{t.register.fullNameLabel}</label>
              <input
                id="fullName"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="phone">{t.register.phoneLabel}</label>
              <input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="email">{t.register.emailLabel}</label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="password">{t.register.passwordLabel}</label>
              <input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {role === 'anfitrion' ? (
              <>
                <div className="field">
                  <label htmlFor="businessName">{t.register.businessNameLabel}</label>
                  <input
                    id="businessName"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="bio">{t.register.bioLabel}</label>
                  <textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} />
                </div>
              </>
            ) : (
              <>
                <div className="field">
                  <label htmlFor="ecName">{t.register.ecNameLabel}</label>
                  <input
                    id="ecName"
                    value={emergencyContactName}
                    onChange={(e) => setEmergencyContactName(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="ecPhone">{t.register.ecPhoneLabel}</label>
                  <input
                    id="ecPhone"
                    value={emergencyContactPhone}
                    onChange={(e) => setEmergencyContactPhone(e.target.value)}
                  />
                </div>
              </>
            )}

            {error && <p className="form-error">{error}</p>}
            <button type="submit" className="btn btn-solid" disabled={submitting}>
              {submitting ? t.register.submitting : t.register.submit}
            </button>
          </form>
          <p>
            {t.register.haveAccount}
            <Link to="/login">{t.register.loginLink}</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
