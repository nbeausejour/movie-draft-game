import { type NextRequest } from 'next/server'
import { getDb } from '@/lib/db'

export interface CompareMovie {
  tconst: string
  title: string
  rating: number
  posterUrl: string | null
}

export async function GET(request: NextRequest) {
  const score = parseFloat(request.nextUrl.searchParams.get('score') ?? '')
  if (isNaN(score)) return Response.json({ error: 'invalid score' }, { status: 400 })

  // Round to nearest 0.1 to match what we stored
  const bucket = Math.round(score * 10) / 10

  const db = getDb()
  const rows = db.prepare<unknown[], { tconst: string; title: string; rating: number; num_votes: number }>(`
    SELECT tconst, title, rating, num_votes
    FROM reference_movies
    WHERE rating = ?
    ORDER BY num_votes DESC
    LIMIT 3
  `).all(bucket)

  // Fetch TMDB posters if API key is configured
  const tmdbKey = process.env.TMDB_API_KEY
  const movies: CompareMovie[] = await Promise.all(
    rows.map(async (row) => {
      let posterUrl: string | null = null
      if (tmdbKey) {
        try {
          const res = await fetch(
            `https://api.themoviedb.org/3/find/${row.tconst}?external_source=imdb_id&api_key=${tmdbKey}`,
            { next: { revalidate: 86400 } } // cache for 24h
          )
          if (res.ok) {
            const data = await res.json()
            const path = data.movie_results?.[0]?.poster_path
            if (path) posterUrl = `https://image.tmdb.org/t/p/w185${path}`
          }
        } catch {
          // silently fall back to no poster
        }
      }
      return { tconst: row.tconst, title: row.title, rating: row.rating, posterUrl }
    })
  )

  return Response.json(movies)
}
