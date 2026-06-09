'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import type { SlotDef } from '@/lib/types'
import { calcWeightedScore, toStars, starsToEmoji, buildShareText, decadeLabel } from '@/lib/scoring'
import type { CompareMovie } from '@/app/api/compare/route'

interface Props {
  slots: SlotDef[]
  genre: string
  onPlayAgain: () => void
}

export default function Results({ slots, genre, onPlayAgain }: Props) {
  const [copied, setCopied] = useState(false)
  const [compareMovies, setCompareMovies] = useState<CompareMovie[]>([])

  const score = calcWeightedScore(slots)
  const stars = toStars(score)
  const emojiStars = starsToEmoji(stars)

  useEffect(() => {
    fetch(`/api/compare?score=${score.toFixed(1)}`)
      .then(r => r.json())
      .then(setCompareMovies)
      .catch(() => {})
  }, [score])

  function handleShare() {
    const text = `A ${genre} Film\n\n` + buildShareText(slots, stars)
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="flex flex-col gap-6">

      {/* Star + score reveal */}
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

        {/* Stars */}
        <p className="text-4xl mb-2 tracking-wider" style={{ color: 'var(--gold)' }}>{emojiStars}</p>

        {/* Large score */}
        <p className="font-display font-black" style={{ color: 'var(--parchment)', fontSize: '4.5rem', lineHeight: 1 }}>
          {score.toFixed(1)}
        </p>
        <p className="text-xs mt-1 mb-5" style={{ color: 'var(--ink-faded)', fontFamily: 'var(--font-special-elite), serif' }}>
          out of 10
        </p>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px" style={{ background: 'rgba(184,134,11,0.3)' }} />
          <p className="text-[9px] tracking-[0.2em] uppercase shrink-0" style={{ color: 'var(--gold)', fontFamily: 'var(--font-special-elite), serif' }}>
            same score as
          </p>
          <div className="flex-1 h-px" style={{ background: 'rgba(184,134,11,0.3)' }} />
        </div>

        {/* Comparison movies */}
        {compareMovies.length > 0 ? (
          <div className="flex justify-center gap-4">
            {compareMovies.map(movie => (
              <div key={movie.tconst} className="flex flex-col items-center gap-2" style={{ width: '80px' }}>
                {movie.posterUrl ? (
                  <div className="relative overflow-hidden shadow-md" style={{ width: '80px', height: '118px', borderRadius: '3px', border: '1px solid rgba(184,134,11,0.3)' }}>
                    <Image src={movie.posterUrl} alt={movie.title} fill style={{ objectFit: 'cover' }} sizes="80px" />
                  </div>
                ) : (
                  <div
                    className="flex items-center justify-center"
                    style={{ width: '80px', height: '118px', borderRadius: '3px', border: '1px solid rgba(184,134,11,0.3)', background: 'rgba(255,255,255,0.05)' }}
                  >
                    <span style={{ color: 'var(--ink-faded)', fontSize: '1.5rem' }}>🎬</span>
                  </div>
                )}
                <p className="text-center leading-tight" style={{ color: 'var(--parchment)', fontFamily: 'var(--font-special-elite), serif', fontSize: '0.65rem' }}>
                  {movie.title}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs" style={{ color: 'var(--ink-faded)' }}>…</p>
        )}
      </div>

      {/* Genre badge */}
      <div className="flex items-center gap-3">
        <div className="h-px flex-1" style={{ background: 'var(--border)' }} />
        <span
          className="text-[9px] tracking-[0.25em] uppercase px-3 py-1"
          style={{
            background: 'var(--ink)',
            color: 'var(--gold)',
            fontFamily: 'var(--font-special-elite), serif',
            borderRadius: '2px',
          }}
        >
          {genre}
        </span>
        <div className="h-px flex-1" style={{ background: 'var(--border)' }} />
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
