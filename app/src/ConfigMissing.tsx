export function ConfigMissing() {
  return (
    <div className="app-main">
      <div className="event-form-page">
        <div className="form-card">
          <span className="kicker">Raíz</span>
          <h1>Falta configurar Supabase</h1>
          <p>
            No encontré <code>VITE_SUPABASE_URL</code> / <code>VITE_SUPABASE_ANON_KEY</code>. Crea{' '}
            <code>app/.env.local</code> con:
          </p>
          <pre
            style={{
              background: 'var(--paper-2)',
              border: '1px solid var(--rule)',
              borderRadius: 'var(--r-sm)',
              padding: '1rem',
              margin: '1rem 0',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.85rem',
              overflowX: 'auto',
            }}
          >
            VITE_SUPABASE_URL=https://tuproyecto.supabase.co{'\n'}
            VITE_SUPABASE_ANON_KEY=tu-anon-key
          </pre>
          <p>
            Ambos valores están en tu proyecto de Supabase → <strong>Settings → API</strong>{' '}
            (<em>Project URL</em> y la key <em>anon public</em> — nunca la <em>service_role</em>).
          </p>
          <p>Luego reinicia el servidor de dev (Vite solo lee el archivo al arrancar).</p>
        </div>
      </div>
    </div>
  )
}
