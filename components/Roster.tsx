'use client'

import type { SlotDef } from '@/lib/types'
import { decadeLabel } from '@/lib/scoring'

interface Props {
  slots: SlotDef[]
  activeSlot?: string | null
  revealed?: boolean
}

export default function Roster({ slots, activeSlot, revealed = false }: Props) {
  return (
    <div className="flex flex-col gap-1.5">
      {slots.map(slot => {
        const filled = slot.card !== null
        const isActive = slot.key === activeSlot

        return (
          <div
            key={slot.key}
            className="flex items-center gap-3 px-3 py-2.5 transition-all"
            style={{
              background: filled
                ? 'var(--card-bg)'
                : isActive
                  ? 'rgba(184,134,11,0.1)'
                  : 'transparent',
              border: `1.5px solid ${isActive ? 'var(--gold)' : 'var(--border)'}`,
              borderRadius: '4px',
              opacity: (!filled && !isActive) ? 0.55 : 1,
            }}
          >
            <div className="min-w-0 flex-1">
              <p
                className="text-[9px] tracking-[0.15em] uppercase leading-none mb-0.5"
                style={{ color: 'var(--ink-faded)', fontFamily: 'var(--font-special-elite), serif' }}
              >
                {slot.key} · {Math.round(slot.weight * 100)}%
              </p>
              {filled ? (
                <p className="text-sm leading-tight truncate font-display font-bold" style={{ color: 'var(--ink)' }}>
                  {slot.card!.name}
                  <span className="font-normal text-xs ml-1" style={{ color: 'var(--ink-faded)' }}>
                    {decadeLabel(slot.card!.decade)}
                  </span>
                </p>
              ) : (
                <p className="text-xs italic leading-tight" style={{ color: 'var(--border)' }}>—</p>
              )}
            </div>
            {revealed && filled && (
              <span className="text-sm font-bold shrink-0 font-display" style={{ color: 'var(--red)' }}>
                {slot.card!.avgRating.toFixed(1)}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
