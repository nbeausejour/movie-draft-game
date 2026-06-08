'use client'

import { useState } from 'react'
import type { SlotDef } from '@/lib/types'
import { calcWeightedScore, toStars, starsToEmoji, buildShareText, decadeLabel } from '@/lib/scoring'

interface Props {
  slots: SlotDef[]
  onPlayAgain: () => void
}

export default function Results({ slots, onPlayAgain }: Props) {
  const [copied, setCopied] = useState(false)
  const score = calcWeightedScore(slots)
  const stars = toStars(score)
  const emojiStars = starsToEmoji(stars)

  function handleShare() {
    const text = buildShareText(slots, stars)
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="flex flex-col gap-6">

      {/* Star reveal */}
      <div
        className="text-center px-6 py-8 shadow-md"
        style={{ background: 'var(--ink)', border: '2px solid var(--border)', borderRadius: '6px' }}
      >
        <p
          className="text-[9px] tracking-[0.25em] uppercase mb-4"
          style={{ color: 'var(--gold)', fontFamily: 'var(--font-special-elite), serif' }}
        >
          ✦ Your Crew Scored ✦
        </p>
        <p className="text-5xl mb-3 tracking-wider" style={{ color: 'var(--gold)' }}>{emojiStars}</p>
        <p className="font-display font-black text-4xl" style={{ color: 'var(--parchment)' }}>{stars} / 5</p>
        <p className="text-xs mt-2" style={{ color: 'var(--ink-faded)', fontFamily: 'var(--font-special-elite), serif' }}>
          Weighted avg: {score.toFixed(2)}
        </p>
      </div>

      {/* Per-slot breakdown */}
      <div
        className="overflow-hidden shadow-sm"
        style={{ background: 'var(--card-bg)', border: '2px solid var(--border)', borderRadius: '6px' }}
      >
        <p
          className="text-[9px] tracking-[0.2em] uppercase px-5 pt-4 pb-2"
          style={{ color: 'var(--gold)', fontFamily: 'var(--font-special-elite), serif' }}
        >
          ✦ Crew Breakdown ✦
        </p>
        <div style={{ borderTop: '1px solid var(--border)' }}>
          {slots.map((slot, i) => (
            <div
              key={slot.key}
              className="px-5 py-3 flex items-start gap-3"
              style={{ borderBottom: i < slots.length - 1 ? '1px solid var(--parchment-dk)' : 'none' }}
            >
              <div className="flex-1 min-w-0">
                <p
                  className="text-[9px] tracking-[0.15em] uppercase mb-0.5"
                  style={{ color: 'var(--ink-faded)', fontFamily: 'var(--font-special-elite), serif' }}
                >
                  {slot.key}
                </p>
                <p className="font-display font-bold leading-tight text-sm" style={{ color: 'var(--ink)' }}>
                  {slot.card?.name}
                </p>
                <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--ink-faded)' }}>
                  {decadeLabel(slot.card!.decade)} · {slot.card!.films.map(f => f.title).join(', ')}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-display font-bold text-base" style={{ color: 'var(--red)' }}>
                  {slot.card!.avgRating.toFixed(2)}
                </p>
                <p className="text-[9px]" style={{ color: 'var(--ink-faded)' }}>{Math.round(slot.weight * 100)}%</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2">
        <button
          onClick={handleShare}
          className="w-full py-3.5 px-5 transition-all active:scale-[0.98] text-sm tracking-widest uppercase"
          style={{
            background: 'var(--ink)',
            color: 'var(--parchment)',
            border: '2px solid var(--border)',
            borderRadius: '4px',
            fontFamily: 'var(--font-special-elite), serif',
          }}
        >
          {copied ? '✓ Copied!' : 'Copy result to share'}
        </button>
        <button
          onClick={onPlayAgain}
          className="w-full py-3.5 px-5 transition-all active:scale-[0.98] text-sm"
          style={{
            background: 'transparent',
            color: 'var(--ink-faded)',
            border: '2px solid var(--border)',
            borderRadius: '4px',
            fontFamily: 'var(--font-special-elite), serif',
          }}
        >
          Play again
        </button>
      </div>
    </div>
  )
}
