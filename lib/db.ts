import Database from 'better-sqlite3'
import path from 'path'

let _db: ReturnType<typeof Database> | null = null

export function getDb() {
  if (!_db) {
    _db = new Database(path.join(process.cwd(), 'data', 'game.db'), { readonly: true })
  }
  return _db
}
