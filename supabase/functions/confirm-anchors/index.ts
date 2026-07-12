// Pensada para correr en un Cron Trigger de Supabase cada 2-3 minutos.
// Revisa los review_anchors en 'pendiente' con tx_hash ya enviado, y los
// pasa a 'confirmado' o 'fallido' según el recibo en Sepolia. Si la tx
// todavía no se mina, se deja igual y se reintenta en el próximo ciclo.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { createPublicClient, http } from 'npm:viem@2.21.0'
import { sepolia } from 'npm:viem@2.21.0/chains'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(Deno.env.get('SEPOLIA_RPC_URL')),
})

Deno.serve(async () => {
  const { data: pending, error } = await supabase
    .from('review_anchors')
    .select('id, tx_hash')
    .eq('status', 'pendiente')
    .not('tx_hash', 'is', null)

  if (error) {
    console.error('Error leyendo review_anchors pendientes:', error.message)
    return new Response(error.message, { status: 500 })
  }

  let confirmed = 0
  let failed = 0

  for (const anchor of pending ?? []) {
    try {
      const receipt = await publicClient.getTransactionReceipt({
        hash: anchor.tx_hash as `0x${string}`,
      })

      if (receipt.status === 'success') {
        await supabase
          .from('review_anchors')
          .update({
            status: 'confirmado',
            block_number: Number(receipt.blockNumber),
            confirmed_at: new Date().toISOString(),
          })
          .eq('id', anchor.id)
        confirmed++
      } else if (receipt.status === 'reverted') {
        await supabase
          .from('review_anchors')
          .update({ status: 'fallido', error_message: 'Transacción revertida en Sepolia' })
          .eq('id', anchor.id)
        failed++
      }
    } catch {
      // El recibo todavía no existe (la tx no se ha minado) — se deja
      // 'pendiente' y se vuelve a intentar en el siguiente ciclo del cron.
      continue
    }
  }

  return new Response(
    JSON.stringify({ checked: pending?.length ?? 0, confirmed, failed }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
