'use client'

import { useEffect, useRef, useState } from 'react'
import { GENRES } from '@/lib/genres'

interface Props {
  onComplete: (genre: string) => void
}

const ITEM_H = 64        // px height of each drum row
const SPIN_DURATION = 3200 // ms

export default function GenreWheel({ onComplete }: Props) {
  const [offset, setOffset]   = useState(0)
  const [landed, setLanded]   = useState(false)
  const [picked, setPicked]   = useState<number | null>(null)
  const hasSpun = useRef(false)

  // Build a long repeated list so the drum has plenty of scroll room
  const REPEATS = 6
  const items = Array.from({ length: REPEATS }, () => GENRES).flat()

  useEffect(() => {
    if (hasSpun.current) return
    hasSpun.current = true

    // Pick a genre index (0–9)
    const selectedIndex = Math.floor(Math.random() * GENRES.length)
    setPicked(selectedIndex)

    // We want the drum to land with selectedIndex centred in the window.
    // Start near the end of the list to give the illusion of lots of spinning.
    // Land on the genre in the 4th repeat block.
    const landingRow = GENRES.length * 3 + selectedIndex
    const targetOffset = -(landingRow * ITEM_H) + ITEM_H  // +ITEM_H centres it

    // Kick off after a short delay so React has painted
    setTimeout(() => setOffset(targetOffset), 100)

    // Mark landed after spin
    setTimeout(() => setLanded(true), SPIN_DURATION + 100 + 300)

    // Advance to results
    setTimeout(() => onComplete(GENRES[selectedIndex].name), SPIN_DURATION + 100 + 2000)
  }, [onComplete])

  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen px-4"
      style={{ background: 'var(--parchment)' }}
    >
      <p
        className="text-[9px] tracking-[0.3em] uppercase mb-10"
        style={{ color: 'var(--ink-faded)', fontFamily: 'var(--font-special-elite), serif' }}
      >
        ✦ Spinning for genre ✦
      </p>

      {/* Drum window */}
      <div className="relative" style={{ width: 260 }}>

        {/* Top & bottom fade masks */}
        <div className="absolute inset-0 z-10 pointer-events-none" style={{
          background: `linear-gradient(to bottom, var(--parchment) 0%, transparent 30%, transparent 70%, var(--parchment) 100%)`,
          borderRadius: '6px',
        }} />

        {/* Selection highlight — the "landed" row */}
        <div className="absolute z-10 left-0 right-0" style={{
          top: '50%',
          transform: 'translateY(-50%)',
          height: ITEM_H,
          border: `2px solid var(--border)`,
          borderRadius: '4px',
          background: 'rgba(184,134,11,0.08)',
          pointerEvents: 'none',
        }} />

        {/* Scrolling drum */}
        <div style={{ height: ITEM_H * 3, overflow: 'hidden', borderRadius: '6px' }}>
          <div
            style={{
              transform: `translateY(${offset}px)`,
              transition: offset !== 0
                ? `transform ${SPIN_DURATION}ms cubic-bezier(0.15, 0.85, 0.35, 1.0)`
                : 'none',
            }}
          >
            {items.map((genre, i) => (
              <div
                key={i}
                className="flex items-center justify-center"
                style={{
                  height: ITEM_H,
                  fontFamily: 'var(--font-special-elite), serif',
                  fontSize: '1.4rem',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: 'var(--ink)',
                  opacity: 0.85,
                }}
              >
                {genre.name}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Genre reveal beneath drum */}
      <div
        className="mt-10 text-center transition-all duration-700"
        style={{
          opacity: landed ? 1 : 0,
          transform: landed ? 'translateY(0)' : 'translateY(6px)',
        }}
      >
        <p
          className="font-display font-black"
          style={{ fontSize: '3.5rem', color: 'var(--ink)', lineHeight: 1 }}
        >
          {picked !== null ? GENRES[picked].name : ''}
        </p>
        <p
          className="mt-2 text-[9px] tracking-[0.25em] uppercase"
          style={{ color: 'var(--gold)', fontFamily: 'var(--font-special-elite), serif' }}
        >
          ✦ Your genre ✦
        </p>
      </div>
    </div>
  )
}
