export type DbRole = 'director' | 'actor' | 'actress' | 'cinematographer' | 'writer'

export type SlotKey =
  | 'Director'
  | 'Lead Actor'
  | 'Lead Actress'
  | 'Supporting Actor'
  | 'Supporting Actress'
  | 'Cinematographer'
  | 'Screenplay'

export interface Film {
  tconst: string
  title: string
  year: number
  numVotes: number
  avgRating: number
}

export interface CardData {
  id: number
  personId: string
  name: string
  role: DbRole
  decade: number
  avgRating: number
  films: Film[]
}

export interface SlotDef {
  key: SlotKey
  weight: number
  accepts: DbRole[]
  card: CardData | null
}

export const SLOT_DEFS: Omit<SlotDef, 'card'>[] = [
  { key: 'Director',           weight: 0.25, accepts: ['director'] },
  { key: 'Lead Actor',         weight: 0.20, accepts: ['actor'] },
  { key: 'Lead Actress',       weight: 0.20, accepts: ['actress'] },
  { key: 'Supporting Actor',   weight: 0.10, accepts: ['actor'] },
  { key: 'Supporting Actress', weight: 0.10, accepts: ['actress'] },
  { key: 'Cinematographer',    weight: 0.08, accepts: ['cinematographer'] },
  { key: 'Screenplay',         weight: 0.07, accepts: ['writer'] },
]

export const MAX_PASSES = 14
