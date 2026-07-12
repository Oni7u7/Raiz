// Fórmula única del hash de una review — usada por anchor-review y por
// cualquier herramienta de verificación futura. Si esto cambia, los
// anchors ya anclados dejan de poder verificarse, así que no se toca
// a la ligera.
export interface HashableReview {
  id: string
  rating: number
  comment: string | null
  created_at: string
}

export async function computeReviewHash(review: HashableReview): Promise<`0x${string}`> {
  const canonical = `${review.id}|${review.rating}|${review.comment ?? ''}|${review.created_at}`
  const bytes = new TextEncoder().encode(canonical)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  const hex = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  return `0x${hex}`
}
