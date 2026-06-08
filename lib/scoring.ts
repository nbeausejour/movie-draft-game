import type { SlotDef } from './types'

export function calcWeightedScore(slots: SlotDef[]): number {
  let weightedSum = 0
  let totalWeight = 0
  for (const slot of slots) {
    if (slot.card) {
      weightedSum += slot.card.avgRating * slot.weight
      totalWeight += slot.weight
    }
  }
  return totalWeight > 0 ? weightedSum / totalWeight : 0
}

export function toStars(score: number): number {
  if (score < 6.0) return 0.5
  if (score < 6.5) return 1
  if (score < 7.0) return 1.5
  if (score < 7.4) return 2
  if (score < 7.7) return 2.5
  if (score < 8.0) return 3
  if (score < 8.3) return 3.5
  if (score < 8.6) return 4
  if (score < 8.9) return 4.5
  return 5
}

export function starsToEmoji(stars: number): string {
  const full  = Math.floor(stars)
  const half  = stars % 1 !== 0
  return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(5 - full - (half ? 1 : 0))
}

const DECADE_LABELS: Record<number, string> = {
  1920: '20s', 1930: '30s', 1940: '40s', 1950: '50s',
  1960: '60s', 1970: '70s', 1980: '80s', 1990: '90s',
  2000: '00s', 2010: '10s', 2020: '20s',
}
export function decadeLabel(decade: number): string {
  return DECADE_LABELS[decade] ?? `${decade}s`
}

export function buildShareText(slots: SlotDef[], stars: number): string {
  const emojiStars = starsToEmoji(stars)
  const lines = [
    `🎬 Movie Draft — ${stars} stars`,
    emojiStars,
    '',
    ...slots.map(s => {
      if (!s.card) return `${s.key}: —`
      return `${s.key}: ${s.card.name} (${decadeLabel(s.card.decade)})`
    }),
  ]
  return lines.join('\n')
}
