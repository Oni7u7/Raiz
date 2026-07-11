import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import type { UserRole } from '../types/database'

export function Register() {
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
            <h1>Revisa tu correo</h1>
            <p>
              Te mandamos un enlace de confirmación a <strong>{email}</strong>. Confírmalo y luego
              inicia sesión.
            </p>
            <Link to="/login">Ir a iniciar sesión</Link>
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
          <h1>Crear cuenta</h1>
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label>Soy…</label>
              <div className="field-radios">
                <label>
                  <input
                    type="radio"
                    name="role"
                    checked={role === 'participante'}
                    onChange={() => setRole('participante')}
                  />
                  Participante
                </label>
                <label>
                  <input
                    type="radio"
                    name="role"
                    checked={role === 'anfitrion'}
                    onChange={() => setRole('anfitrion')}
                  />
                  Anfitrión
                </label>
              </div>
            </div>

            <div className="field">
              <label htmlFor="fullName">Nombre completo</label>
              <input
                id="fullName"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="phone">Teléfono</label>
              <input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="password">Contraseña</label>
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
                  <label htmlFor="businessName">Nombre del negocio</label>
                  <input
                    id="businessName"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="bio">Bio</label>
                  <textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} />
                </div>
              </>
            ) : (
              <>
                <div className="field">
                  <label htmlFor="ecName">Contacto de emergencia — nombre</label>
                  <input
                    id="ecName"
                    value={emergencyContactName}
                    onChange={(e) => setEmergencyContactName(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="ecPhone">Contacto de emergencia — teléfono</label>
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
              {submitting ? 'Creando cuenta…' : 'Crear cuenta'}
            </button>
          </form>
          <p>
            ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
