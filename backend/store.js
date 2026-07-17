import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createSeedData } from './seed.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_FILE = path.join(__dirname, 'data.json')

let cache = null

export function loadStore() {
  if (cache) return cache

  if (fs.existsSync(DATA_FILE)) {
    try {
      cache = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'))
      return cache
    } catch {
      console.warn('Corrupt data.json — reseeding.')
    }
  }

  cache = createSeedData()
  saveStore()
  return cache
}

export function saveStore() {
  if (!cache) return
  fs.writeFileSync(DATA_FILE, JSON.stringify(cache, null, 2))
}

export function getDataFilePath() {
  return DATA_FILE
}
