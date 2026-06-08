import { type NextRequest } from 'next/server'
import { getDb } from '@/lib/db'
import type { CardData, DbRole } from '@/lib/types'

export async function GET(request: NextRequest) {
  const url = request.nextUrl
  const rolesParam = url.searchParams.get('roles') ?? ''
  const seenParam  = url.searchParams.get('seen')  ?? ''

  const roles = rolesParam.split(',').filter(Boolean) as DbRole[]
  const seen  = seenParam.split(',').filter(Boolean).map(Number)

  if (roles.length === 0) {
    return Response.json({ error: 'no roles needed' }, { status: 400 })
  }

  const db = getDb()

  const placeholders = roles.map(() => '?').join(',')
  const excludePlaceholders = seen.length > 0 ? `AND c.id NOT IN (${seen.map(() => '?').join(',')})` : ''

  const card = db.prepare<unknown[], {
    id: number; person_id: string; name: string; role: DbRole;
    decade: number; avg_rating: number
  }>(`
    SELECT c.id, c.person_id, p.name, c.role, c.decade, c.avg_rating
    FROM cards c
    JOIN people p ON p.id = c.person_id
    WHERE c.role IN (${placeholders})
    ${excludePlaceholders}
    ORDER BY RANDOM()
    LIMIT 1
  `).get(...roles, ...seen)

  if (!card) {
    return Response.json({ error: 'no cards available' }, { status: 404 })
  }

  const films = db.prepare<unknown[], { tconst: string; title: string; year: number; num_votes: number; avg_rating: number }>(`
    SELECT tconst, title, year, MAX(num_votes) as num_votes, avg_rating
    FROM card_films
    WHERE card_id = ?
    GROUP BY tconst
    ORDER BY num_votes DESC
    LIMIT 3
  `).all(card.id)

  const result: CardData = {
    id: card.id,
    personId: card.person_id,
    name: card.name,
    role: card.role,
    decade: card.decade,
    avgRating: card.avg_rating,
    films: films.map((f: { tconst: string; title: string; year: number; num_votes: number; avg_rating: number }) => ({
      tconst: f.tconst,
      title: f.title,
      year: f.year,
      numVotes: f.num_votes,
      avgRating: f.avg_rating,
    })),
  }

  return Response.json(result)
}
