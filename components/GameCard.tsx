'use client'

import type { CardData, SlotKey } from '@/lib/types'

const ROLE_LABELS: Record<string, string> = {
  director:        'Director',
  actor:           'Actor',
  actress:         'Actress',
  cinematographer: 'Cinematographer',
  writer:          'Screenwriter',
}

const DECADE_FULL: Record<number, string> = {
  1920: '1920s', 1930: '1930s', 1940: '1940s', 1950: '1950s',
  1960: '1960s', 1970: '1970s', 1980: '1980s', 1990: '1990s',
  2000: '2000s', 2010: '2010s', 2020: '2020s',
}

interface Props {
  card: CardData
  availableSlots: SlotKey[]
  passesLeft: number
  onAssign: (slot: SlotKey) => void
  onPass: () => void
}

export default function GameCard({ card, availableSlots, passesLeft, onAssign, onPass }: Props) {
  const canPass = passesLeft > 0
  const decadeFull = DECADE_FULL[card.decade] ?? `${card.decade}s`

  return (
    <div className="flex flex-col gap-5">
      {/* Two cards side by side */}
      <div className="flex gap-3">

        {/* Person card */}
        <div
          className="flex-1 flex flex-col overflow-hidden shadow-md"
          style={{
            background: 'var(--card-bg)',
            border: '2px solid var(--border)',
            borderRadius: '6px',
          }}
        >
          {/* Header band */}
          <div
            className="px-4 pt-4 pb-3"
            style={{ background: 'var(--ink)', borderBottom: '2px solid var(--border)' }}
          >
            <p
              className="text-[9px] tracking-[0.2em] uppercase mb-2"
              style={{ color: 'var(--gold)', fontFamily: 'var(--font-special-elite), serif' }}
            >
              ✦ {ROLE_LABELS[card.role]} ✦
            </p>
            <h2
              className="text-xl leading-tight font-display font-bold"
              style={{ color: 'var(--parchment)' }}
            >
              {card.name}
            </h2>
          </div>

          {/* Film list */}
          <div className="px-4 py-4 flex flex-col gap-2 flex-1">
            {card.films.map((film, i) => (
              <p
                key={film.tconst}
                className="text-xs leading-snug truncate"
                style={{ color: i === 0 ? 'var(--ink)' : 'var(--ink-faded)' }}
              >
                {film.title}
              </p>
            ))}
          </div>

          {/* Bottom rule */}
          <div className="mx-4 mb-3 h-px" style={{ background: 'var(--border)' }} />
        </div>

        {/* Decade card */}
        <div
          className="w-28 flex flex-col items-center justify-center shrink-0 select-none shadow-md"
          style={{
            background: 'var(--red)',
            border: '2px solid var(--border)',
            borderRadius: '6px',
          }}
        >
          <p
            className="text-[9px] tracking-[0.2em] uppercase mb-3"
            style={{ color: 'rgba(245,237,216,0.55)', fontFamily: 'var(--font-special-elite), serif' }}
          >
            Decade
          </p>
          <p
            className="font-display font-black leading-none text-center"
            style={{ color: 'var(--parchment)', fontSize: '2rem' }}
          >
            {decadeFull}
          </p>
          <div className="mt-3 w-8 h-px" style={{ background: 'rgba(245,237,216,0.35)' }} />
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2">
        {availableSlots.length === 0 && (
          <p className="text-center text-sm italic" style={{ color: 'var(--ink-faded)' }}>
            All matching slots are filled — you must pass.
          </p>
        )}
        {availableSlots.map(slot => (
          <button
            key={slot}
            onClick={() => onAssign(slot)}
            className="w-full font-semibold py-3 px-5 transition-all active:scale-[0.98] tracking-wide text-sm uppercase"
            style={{
              background: 'var(--ink)',
              color: 'var(--parchment)',
              border: '2px solid var(--border)',
              borderRadius: '4px',
              fontFamily: 'var(--font-special-elite), serif',
              letterSpacing: '0.08em',
            }}
          >
            Assign to {slot}
          </button>
        ))}
        <button
          onClick={onPass}
          disabled={!canPass}
          className="w-full py-3 px-5 transition-all active:scale-[0.98] text-sm"
          style={{
            background: 'transparent',
            color: canPass ? 'var(--ink-faded)' : 'var(--border)',
            border: '2px solid var(--border)',
            borderRadius: '4px',
            fontFamily: 'var(--font-special-elite), serif',
            opacity: canPass ? 1 : 0.45,
            cursor: canPass ? 'pointer' : 'not-allowed',
          }}
        >
          Pass {canPass ? `(${passesLeft} left)` : '(none left)'}
        </button>
      </div>
    </div>
  )
}
