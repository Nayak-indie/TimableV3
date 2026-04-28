import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { EMPTY_DEV_DB, cloneDevDb, normalizeDevDb, type DevDb } from './dev-db'

const DEV_DB_PATH = path.join(process.cwd(), '.cache', 'timable-dev-db.json')

export async function readDevDbFile(): Promise<DevDb> {
  try {
    const raw = await readFile(DEV_DB_PATH, 'utf8')
    return normalizeDevDb(JSON.parse(raw))
  } catch {
    return cloneDevDb(EMPTY_DEV_DB)
  }
}

export async function writeDevDbFile(db: DevDb) {
  await mkdir(path.dirname(DEV_DB_PATH), { recursive: true })
  await writeFile(DEV_DB_PATH, JSON.stringify(normalizeDevDb(db), null, 2), 'utf8')
}
