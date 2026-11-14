// Regression: after a deploy, vite:preloadError was always cancelled. A cancelled preload makes the
// dynamic import resolve to undefined, so React.lazy crashed with "Cannot read properties of
// undefined (reading 'default')" whenever the 60 s reload cooldown blocked the reload.
const listeners = {}
let reloads = 0
const store = new Map()
globalThis.window = {
  addEventListener: (type, fn) => { listeners[type] = fn },
  location: { reload: () => { reloads++ } },
  sessionStorage: { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)) },
}
const assert = (c, m) => { if (!c) throw new Error(m) }
const fire = () => { const e = { defaultPrevented: false, message: 'Failed to fetch dynamically imported module', preventDefault() { this.defaultPrevented = true } }; listeners['vite:preloadError'](e); return e }

// 1st stale chunk: reload and cancel the error (import may resolve undefined; page is reloading)
let mod = await import('../src/utils/chunkRecovery.js?first')
mod.installVitePreloadRecovery()
let e = fire()
assert(reloads === 1 && e.defaultPrevented && mod.isReloadingForStaleAsset(), 'first stale chunk must reload and cancel the error')

// Fresh page load inside the 60 s cooldown: no reload possible -> the error must NOT be cancelled
mod = await import('../src/utils/chunkRecovery.js?second')
mod.installVitePreloadRecovery()
e = fire()
assert(reloads === 1 && !e.defaultPrevented && !mod.isReloadingForStaleAsset(), 'blocked reload must let the real error through (no undefined module)')
assert(mod.reloadOnceForStaleAsset(new TypeError("Cannot read properties of undefined (reading 'default')")) === false, 'cooldown still applies to the error boundary path')

// After the cooldown the error boundary recognises the lazy crash and reloads
store.clear()
assert(mod.reloadOnceForStaleAsset(new TypeError("Cannot read properties of undefined (reading 'default')")) === true && reloads === 2, "error boundary must reload on React.lazy \"reading 'default'\"")
assert(mod.isReloadingForStaleAsset() && mod.reloadOnceForStaleAsset(new Error('Some other bug')) === false, 'unrelated errors never trigger a reload; the boundary uses isReloadingForStaleAsset')
console.log('Chunk recovery regression test passed.')
