import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'src')
const entry = path.join(root, 'main.jsx')
const extensions = ['.js', '.jsx', '.mjs', '.css']
const allFiles = []

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full)
    else if (extensions.includes(path.extname(entry.name))) allFiles.push(path.normalize(full))
  }
}
walk(root)

function resolveLocal(fromFile, specifier) {
  if (!specifier.startsWith('.')) return null
  const base = path.resolve(path.dirname(fromFile), specifier)
  const candidates = [
    base,
    ...extensions.map(ext => base + ext),
    ...extensions.map(ext => path.join(base, 'index' + ext)),
  ]
  return candidates.find(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile()) || null
}

const importPattern = /(?:import\s+(?:[^'"]+?\s+from\s+)?|import\s*\(|@import\s+)(['"])([^'"]+)\1/g
const reachable = new Set()
const queue = [entry]

while (queue.length) {
  const file = path.normalize(queue.pop())
  if (reachable.has(file)) continue
  reachable.add(file)
  const source = fs.readFileSync(file, 'utf8')
  for (const match of source.matchAll(importPattern)) {
    const resolved = resolveLocal(file, match[2])
    if (resolved && !reachable.has(path.normalize(resolved))) queue.push(resolved)
  }
}

const unreachable = allFiles
  .filter(file => !reachable.has(file))
  .map(file => path.relative(root, file).replaceAll(path.sep, '/'))
  .sort()

if (unreachable.length) {
  console.error('Unreachable frontend source files detected:')
  unreachable.forEach(file => console.error(` - ${file}`))
  process.exit(1)
}

console.log(`Frontend source graph check passed: ${allFiles.length} source files are reachable from main.jsx.`)
