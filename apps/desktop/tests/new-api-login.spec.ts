import type { EventEmitter } from 'node:events'
import { beforeEach, expect, it, onTestFinished, vi } from 'vitest'

interface WindowFace extends EventEmitter {
  options: Record<string, unknown>
  destroyed: boolean
  webContents: EventEmitter & { openHandler: (() => { action: string }) | undefined }
  loadURL: ReturnType<typeof vi.fn>
}

const state = vi.hoisted(() => ({
  window: undefined as WindowFace | undefined,
  cookies: undefined as EventEmitter | undefined,
  partitions: [] as string[],
  clear: vi.fn(async () => {}),
}))

vi.mock('electron', async () => {
  const { EventEmitter } = await import('node:events')
  state.cookies = new EventEmitter()
  class Contents extends EventEmitter {
    openHandler: (() => { action: string }) | undefined
    setWindowOpenHandler(handler: () => { action: string }) { this.openHandler = handler }
  }
  class Window extends EventEmitter {
    destroyed = false
    webContents = new Contents()
    loadURL = vi.fn(async (_url: string) => {})
    constructor(readonly options: Record<string, unknown>) { super(); state.window = this }
    setMenu(_menu: null) {}
    isDestroyed() { return this.destroyed }
    destroy() { this.destroyed = true; this.emit('closed') }
  }
  return { BrowserWindow: Window, session: { fromPartition: (partition: string) => {
    state.partitions.push(partition)
    return { cookies: state.cookies, clearStorageData: state.clear, setPermissionRequestHandler() {}, setPermissionCheckHandler() {} }
  } } }
})

const { openNewApiLoginWindow } = await import('../src/hallucodex/new-api-login.ts')
const refresh = `a3851245-c3e5-4e2b-8b78-6ac18c57c835.${'r'.repeat(43)}`
const cookie = { name: 'new_api_refresh', value: refresh, domain: 'relay.example', path: '/api/user/auth', httpOnly: true }
const options = { parent: undefined, title: 'NovaFlow account', timeoutMs: 300000 }

beforeEach(() => { state.window = undefined; state.partitions = []; state.clear.mockClear() })

it('uses an isolated sandbox, pins navigation and reads only the first-party HttpOnly refresh cookie', async () => {
  const controller = new AbortController()
  const signedIn = openNewApiLoginWindow('https://relay.example', controller.signal, options)
  onTestFinished(async () => { controller.abort(); await signedIn.catch(() => {}) })
  const window = state.window!
  expect(state.partitions[0]).toMatch(/^novaflow-login-/)
  expect(state.partitions[0]).not.toContain('persist:')
  expect(window.options.webPreferences).toMatchObject({ sandbox: true, contextIsolation: true, nodeIntegration: false, webSecurity: true })
  expect(window.options.title).toContain('https://relay.example')
  const titleEvent = { preventDefault: vi.fn() }
  window.emit('page-title-updated', titleEvent, 'Untrusted page title')
  expect(titleEvent.preventDefault).toHaveBeenCalledOnce()
  expect(window.loadURL).toHaveBeenCalledWith('https://relay.example/sign-in')
  expect(window.webContents.openHandler?.()).toEqual({ action: 'deny' })
  const event = { preventDefault: vi.fn() }
  window.webContents.emit('will-navigate', event, 'https://unrelated.example/')
  expect(event.preventDefault).toHaveBeenCalledOnce()
  state.cookies!.emit('changed', {}, { ...cookie, domain: 'unrelated.example' }, 'explicit', false)
  state.cookies!.emit('changed', {}, { ...cookie, httpOnly: false }, 'explicit', false)
  expect(window.destroyed).toBe(false)
  state.cookies!.emit('changed', {}, cookie, 'explicit', false)
  expect(await signedIn).toBe(refresh)
  expect(window.destroyed).toBe(true)
  expect(state.clear).toHaveBeenCalledOnce()
  expect(state.cookies!.listenerCount('changed')).toBe(0)
})

it('closes and clears only the owned login session on cancellation', async () => {
  const controller = new AbortController()
  const pending = openNewApiLoginWindow('https://relay.example', controller.signal, options)
  onTestFinished(async () => { controller.abort(); await pending.catch(() => {}) })
  const rejected = expect(pending).rejects.toMatchObject({ code: 'cancelled' })
  controller.abort()
  await rejected
  expect(state.window?.destroyed).toBe(true)
  expect(state.clear).toHaveBeenCalledOnce()
  expect(state.cookies!.listenerCount('changed')).toBe(0)
})

it('expires an unfinished login without keeping its window or cookie listener', async () => {
  vi.useFakeTimers()
  const controller = new AbortController()
  const pending = openNewApiLoginWindow('https://relay.example', controller.signal, { ...options, timeoutMs: 1000 })
  onTestFinished(async () => { controller.abort(); await pending.catch(() => {}); vi.useRealTimers() })
  const rejected = expect(pending).rejects.toMatchObject({ code: 'expired' })
  await vi.advanceTimersByTimeAsync(1000)
  await rejected
  expect(state.window?.destroyed).toBe(true)
  expect(state.cookies!.listenerCount('changed')).toBe(0)
})
