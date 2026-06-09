export const GENRES = [
  { name: 'Horror',    color: '#6b1a1a' },
  { name: 'Romance',   color: '#8b2252' },
  { name: 'Western',   color: '#7a4a1a' },
  { name: 'Sci-Fi',    color: '#1a3a6b' },
  { name: 'Comedy',    color: '#6b5a1a' },
  { name: 'Thriller',  color: '#2a4a2a' },
  { name: 'Musical',   color: '#5a1a6b' },
  { name: 'Noir',      color: '#1a1a2a' },
  { name: 'Adventure', color: '#1a5a4a' },
  { name: 'Drama',     color: '#4a2a1a' },
]

export type Genre = typeof GENRES[number]
