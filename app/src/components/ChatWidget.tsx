import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useLanguage } from '../context/LanguageContext'

export interface SuggestedAction {
  type: 'add_restriction'
  restriction_id: string
  label: string
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  suggestedAction?: SuggestedAction
  actionConfirmed?: boolean
}

interface ChatWidgetProps {
  role: 'anfitrion' | 'participante'
  /** Contexto opcional de la pantalla actual (ej. el evento que se está viendo) para dar mejores respuestas. */
  context?: string
  /**
   * El chatbot nunca escribe directo en la base de datos: solo sugiere. Esta
   * función reusa la lógica de escritura que ya existe en el dashboard (ej.
   * toggleRestriction) cuando el usuario confirma una sugerencia.
   */
  onConfirmAction?: (action: SuggestedAction) => Promise<void>
}

export function ChatWidget({ role, context, onConfirmAction }: ChatWidgetProps) {
  const { t, language } = useLanguage()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function sendMessage(e: FormEvent) {
    e.preventDefault()
    const text = input.trim()
    if (!text || sending) return

    const history = messages.slice(-10).map((m) => ({ role: m.role, content: m.content }))
    setMessages((prev) => [...prev, { role: 'user', content: text }])
    setInput('')
    setError(null)
    setSending(true)

    const { data, error: invokeError } = await supabase.functions.invoke('chat-assistant', {
      body: { message: text, history, context, language },
    })

    setSending(false)

    if (invokeError || !data || data.error) {
      setError((data && data.error) || invokeError?.message || t.chatWidget.genericError)
      return
    }

    setMessages((prev) => [
      ...prev,
      { role: 'assistant', content: data.reply, suggestedAction: data.suggested_action ?? undefined },
    ])
  }

  async function confirmAction(index: number, action: SuggestedAction) {
    if (!onConfirmAction) return
    await onConfirmAction(action)
    setMessages((prev) => prev.map((m, i) => (i === index ? { ...m, actionConfirmed: true } : m)))
  }

  return (
    <div className={`chat-widget ${open ? 'chat-widget-open' : ''}`}>
      {open && (
        <div className="chat-panel">
          <div className="chat-panel-header">
            <span className="kicker">{t.chatWidget.assistantLabel}</span>
            <button
              type="button"
              className="chat-close"
              onClick={() => setOpen(false)}
              aria-label={t.chatWidget.closeAria}
            >
              ✕
            </button>
          </div>

          <div className="chat-messages">
            {messages.length === 0 && (
              <p className="lede chat-empty">
                {role === 'anfitrion' ? t.chatWidget.emptyHost : t.chatWidget.emptyParticipant}
              </p>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`chat-msg chat-msg-${m.role}`}>
                <p>{m.content}</p>
                {m.suggestedAction && !m.actionConfirmed && onConfirmAction && (
                  <button
                    type="button"
                    className="btn btn-solid chat-suggestion"
                    onClick={() => confirmAction(i, m.suggestedAction!)}
                  >
                    {t.chatWidget.suggestionPrefix} "{m.suggestedAction.label}"
                  </button>
                )}
                {m.suggestedAction && m.actionConfirmed && (
                  <span className="review-done">{t.chatWidget.suggestionDone}</span>
                )}
              </div>
            ))}
            {sending && <p className="chat-typing">{t.chatWidget.typing}</p>}
            {error && <p className="form-error">{error}</p>}
          </div>

          <form className="chat-input-row" onSubmit={sendMessage}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t.chatWidget.placeholder}
              disabled={sending}
            />
            <button type="submit" className="btn btn-solid" disabled={sending || !input.trim()}>
              {t.chatWidget.send}
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        className="chat-bubble"
        onClick={() => setOpen((v) => !v)}
        aria-label={t.chatWidget.openAria}
      >
        {open ? '✕' : '💬'}
      </button>
    </div>
  )
}
