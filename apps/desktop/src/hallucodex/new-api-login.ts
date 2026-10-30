/** Isolated first-party login window; only its HttpOnly refresh cookie reaches the native account broker. */
import { randomBytes } from 'node:crypto'
import { BrowserWindow, session } from 'electron'
import { NovaFlowAuthError } from './auth-protocol.ts'
import { NEW_API_REFRESH_COOKIE, newApiSessionId } from './new-api.ts'

/** Native window presentation and login lifetime. */
export interface NewApiLoginWindowOptions {
  readonly parent: BrowserWindow | undefined
  readonly title: string
  readonly timeoutMs: number
}

/**
 * Let the site's own login page perform password, MFA and other verification in a temporary, sandboxed session.
 * @param origin - Exact first-party site origin.
 * @param signal - Account generation cancellation.
 * @param options - Window presentation and timeout.
 * @returns The validated HttpOnly refresh cookie after the login window and its temporary storage are closed.
 */
export function openNewApiLoginWindow(origin: string, signal: AbortSignal, options: NewApiLoginWindowOptions): Promise<string> {
  if (signal.aborted) return Promise.reject(new NovaFlowAuthError('cancelled'))
  const site = new URL(origin)
  if (site.origin !== origin || (site.protocol !== 'https:' && !['127.0.0.1', '[::1]', 'localhost'].includes(site.hostname))) {
    return Promise.reject(new NovaFlowAuthError('invalid_response'))
  }
  const partition = `novaflow-login-${randomBytes(16).toString('hex')}`
  const isolated = session.fromPartition(partition)
  isolated.setPermissionRequestHandler((_contents, _permission, callback) => { callback(false) })
  isolated.setPermissionCheckHandler(() => false)
  const window = new BrowserWindow({ width: 560, height: 760, title: `${options.title} — ${origin}`,
    ...options.parent === undefined ? {} : { parent: options.parent },
    webPreferences: { partition, sandbox: true, contextIsolation: true, nodeIntegration: false, webSecurity: true },
  })
  window.setMenu(null)
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  const navigation = (event: Electron.Event, url: string): void => {
    try { if (new URL(url).origin === origin) return }
    catch (_invalidUrl) { /* Invalid navigation is rejected below. */ }
    event.preventDefault()
  }
  window.webContents.on('will-navigate', navigation)
  window.webContents.on('will-redirect', navigation)
  window.on('page-title-updated', (event) => { event.preventDefault() })
  return new Promise<string>((resolve, reject) => {
    let settled = false
    const finish = (value: string | NovaFlowAuthError): void => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      signal.removeEventListener('abort', abort)
      isolated.cookies.off('changed', changed)
      if (!window.isDestroyed()) window.destroy()
      // This partition is owned by this login attempt and never uses persist: or a user's browser session.
      void isolated.clearStorageData().then(() => {
        if (value instanceof NovaFlowAuthError) reject(value)
        else resolve(value)
      }, () => { reject(new NovaFlowAuthError('storage_error')) })
    }
    const abort = (): void => { finish(new NovaFlowAuthError('cancelled')) }
    const changed = (_event: Electron.Event, cookie: Electron.Cookie, _cause: string, removed: boolean): void => {
      if (removed || cookie.name !== NEW_API_REFRESH_COOKIE || cookie.domain !== site.hostname
        || cookie.path !== '/api/user/auth' || !cookie.httpOnly) return
      try { newApiSessionId(cookie.value) }
      catch (_invalidCookie) { finish(new NovaFlowAuthError('invalid_response')); return }
      finish(cookie.value)
    }
    const timer = setTimeout(() => { finish(new NovaFlowAuthError('expired')) }, options.timeoutMs)
    signal.addEventListener('abort', abort, { once: true })
    isolated.cookies.on('changed', changed)
    window.on('closed', abort)
    window.webContents.on('did-fail-load', (_event, code, _description, _url, isMainFrame) => {
      if (isMainFrame && code !== -3) finish(new NovaFlowAuthError('network_error'))
    })
    if (signal.aborted) { abort(); return }
    void window.loadURL(`${origin}/sign-in`).catch(() => { finish(new NovaFlowAuthError('network_error')) })
  })
}
