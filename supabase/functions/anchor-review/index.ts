// Disparada por un Database Webhook de Supabase: AFTER INSERT ON reviews.
// Calcula el hash del contenido tal como quedó guardado (no de nada que
// mande el cliente) y lo ancla en Sepolia con una transacción de valor 0
// y el hash en el campo `data`. No bloquea ni afecta la review en sí —
// si algo aquí falla, la review ya está guardada de todas formas.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { createWalletClient, http } from 'npm:viem@2.21.0'
import { privateKeyToAccount } from 'npm:viem@2.21.0/accounts'
import { sepolia } from 'npm:viem@2.21.0/chains'
import { computeReviewHash } from '../_shared/hash.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

Deno.serve(async (req) => {
  let payload: { record?: { id: string; rating: number; comment: string | null; created_at: string } }

  try {
    payload = await req.json()
  } catch {
    return new Response('JSON inválido', { status: 400 })
  }

  const review = payload.record
  if (!review?.id) {
    return new Response('Falta record.id en el payload del webhook', { status: 400 })
  }

  // Idempotencia: si ya existe un anchor para esta review (reintento del
  // webhook, doble invocación, etc.), no dupliques ni reenvíes otra tx.
  const { data: existing } = await supabase
    .from('review_anchors')
    .select('id')
    .eq('review_id', review.id)
    .maybeSingle()

  if (existing) {
    return new Response('Ya existe un anchor para esta review', { status: 200 })
  }

  const contentHash = await computeReviewHash(review)

  const { error: insertError } = await supabase.from('review_anchors').insert({
    review_id: review.id,
    content_hash: contentHash,
    network: 'sepolia',
    status: 'pendiente',
  })

  if (insertError) {
    console.error('Error insertando review_anchors:', insertError.message)
    return new Response(insertError.message, { status: 500 })
  }

  let txHash: `0x${string}`
  try {
    const account = privateKeyToAccount(Deno.env.get('SEPOLIA_PRIVATE_KEY') as `0x${string}`)
    const client = createWalletClient({
      account,
      chain: sepolia,
      transport: http(Deno.env.get('SEPOLIA_RPC_URL')),
    })

    txHash = await client.sendTransaction({
      to: account.address, // se manda a sí misma; el destino es irrelevante, lo que importa es el data
      value: 0n,
      data: contentHash,
    })
  } catch (txError) {
    console.error('Error enviando la transacción de anclaje:', txError)
    await supabase
      .from('review_anchors')
      .update({ status: 'fallido', error_message: String(txError) })
      .eq('review_id', review.id)
    return new Response('La review se guardó bien; el anclaje en blockchain falló', { status: 200 })
  }

  await supabase.from('review_anchors').update({ tx_hash: txHash }).eq('review_id', review.id)

  return new Response(JSON.stringify({ ok: true, review_id: review.id, tx_hash: txHash }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
