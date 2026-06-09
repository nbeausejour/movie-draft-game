'use client'

import { useState, useEffect, useCallback } from 'react'
import type { CardData, SlotDef, SlotKey, DbRole } from '@/lib/types'
import { SLOT_DEFS, MAX_PASSES } from '@/lib/types'
import GameCard from '@/components/GameCard'
import Roster from '@/components/Roster'
import Results from '@/components/Results'
import GenreWheel from '@/components/GenreWheel'

function freshSlots(): SlotDef[] {
  return SLOT_DEFS.map(def => ({ ...def, card: null }))
}

type Phase = 'loading' | 'drafting' | 'spinning' | 'done'

export default function Page() {
  const [slots, setSlots]             = useState<SlotDef[]>(freshSlots)
  const [currentCard, setCurrentCard] = useState<CardData | null>(null)
  const [seenIds, setSeenIds]         = useState<number[]>([])
  const [passesLeft, setPassesLeft]   = useState(MAX_PASSES)
  const [genre, setGenre]             = useState<string | null>(null)
  const [phase, setPhase]             = useState<Phase>('loading')
  const [error, setError]             = useState<string | null>(null)

  function neededRoles(currentSlots: SlotDef[]): DbRole[] {
    const needed = new Set<DbRole>()
    for (const slot of currentSlots) {
      if (!slot.card) slot.accepts.forEach(r => needed.add(r))
    }
    return [...needed]
  }

  function availableSlotsFor(role: DbRole, currentSlots: SlotDef[]): SlotKey[] {
    return currentSlots
      .filter(s => !s.card && s.accepts.includes(role))
      .map(s => s.key)
  }

  const drawCard = useCallback(async (currentSlots: SlotDef[], currentSeen: number[]) => {
    setPhase('loading')
    setError(null)
    const roles = neededRoles(currentSlots)
    if (roles.length === 0) {
      setPhase('done')
      return
    }
    try {
      const params = new URLSearchParams({
        roles: roles.join(','),
        seen: currentSeen.join(','),
      })
      const res = await fetch(`/api/draw?${params}`)
      if (!res.ok) throw new Error('Failed to draw card')
      const card: CardData = await res.json()
      setCurrentCard(card)
      setSeenIds(prev => [...prev, card.id])
      setPhase('drafting')
    } catch {
      setError('Something went wrong drawing a card. Try refreshing.')
    }
  }, [])

  useEffect(() => {
    const initial = freshSlots()
    drawCard(initial, [])
  }, [drawCard])

  function handleAssign(slot: SlotKey) {
    if (!currentCard) return
    const next = slots.map(s => s.key === slot ? { ...s, card: currentCard } : s)
    setSlots(next)
    const roles = neededRoles(next)
    if (roles.length === 0) {
      setPhase('spinning')
    } else {
      drawCard(next, [...seenIds])
    }
  }

  function handlePass() {
    if (passesLeft <= 0 || !currentCard) return
    setPassesLeft(p => p - 1)
    drawCard(slots, seenIds)
  }

  function handlePlayAgain() {
    const fresh = freshSlots()
    setSlots(fresh)
    setSeenIds([])
    setPassesLeft(MAX_PASSES)
    setCurrentCard(null)
    setGenre(null)
    drawCard(fresh, [])
  }

  function handleGenreSelected(g: string) {
    setGenre(g)
    setPhase('done')
  }

  const availableSlots = currentCard ? availableSlotsFor(currentCard.role, slots) : []
  const filledCount = slots.filter(s => s.card !== null).length

  if (phase === 'spinning') {
    return <GenreWheel onComplete={handleGenreSelected} />
  }

  if (phase === 'done') {
    return (
      <main className="min-h-screen px-4 py-10 flex justify-center" style={{ background: 'var(--parchment)' }}>
        <div className="w-full max-w-md">
          <Header />
          <Results slots={slots} genre={genre!} onPlayAgain={handlePlayAgain} />
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen px-4 py-10" style={{ background: 'var(--parchment)' }}>
      <div className="max-w-2xl mx-auto flex flex-col gap-8">
        <Header />

        {/* Progress */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-1 overflow-hidden" style={{ background: 'var(--parchment-dk)', borderRadius: '2px' }}>
            <div
              className="h-full transition-all duration-500"
              style={{ width: `${(filledCount / 7) * 100}%`, background: 'var(--ink)' }}
            />
          </div>
          <span className="text-xs tabular-nums" style={{ color: 'var(--ink-faded)', fontFamily: 'var(--font-special-elite), serif' }}>
            {filledCount}/7
          </span>
          <span className="text-xs" style={{ color: 'var(--ink-faded)', fontFamily: 'var(--font-special-elite), serif' }}>
            {passesLeft} pass{passesLeft !== 1 ? 'es' : ''} left
          </span>
        </div>

        <div className="flex flex-col md:flex-row gap-8">
          <div className="md:w-64 shrink-0">
            <p
              className="text-[9px] tracking-[0.2em] uppercase mb-3"
              style={{ color: 'var(--ink-faded)', fontFamily: 'var(--font-special-elite), serif' }}
            >
              Your Crew
            </p>
            <Roster
              slots={slots}
              activeSlot={currentCard ? availableSlotsFor(currentCard.role, slots)[0] : null}
            />
          </div>

          <div className="flex-1">
            {phase === 'loading' && (
              <div className="flex items-center justify-center h-64" style={{ color: 'var(--ink-faded)' }}>
                <span className="animate-pulse" style={{ fontFamily: 'var(--font-special-elite), serif' }}>
                  Drawing card…
                </span>
              </div>
            )}
            {phase === 'drafting' && currentCard && (
              <>
                <p
                  className="text-[9px] tracking-[0.2em] uppercase mb-3"
                  style={{ color: 'var(--ink-faded)', fontFamily: 'var(--font-special-elite), serif' }}
                >
                  Current Card
                </p>
                <GameCard
                  card={currentCard}
                  availableSlots={availableSlots}
                  passesLeft={passesLeft}
                  onAssign={handleAssign}
                  onPass={handlePass}
                />
              </>
            )}
            {error && (
              <p className="text-sm text-center" style={{ color: 'var(--red)' }}>{error}</p>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}

function Header() {
  return (
    <div className="mb-2">
      <h1
        className="font-display font-black tracking-tight leading-none"
        style={{ fontSize: '2.2rem', color: 'var(--ink)' }}
      >
        Movie Draft
      </h1>
      <p
        className="mt-1 text-xs tracking-widest uppercase"
        style={{ color: 'var(--ink-faded)', fontFamily: 'var(--font-special-elite), serif' }}
      >
        Build your dream film crew
      </p>
    </div>
  )
}
