/** Native account catalog refresh, committed atomically with the relay selection. */
import { AUTO_GROUP, parseDesktopGroups, allowedGroup, routingGroup } from './group-policy.ts'
import type { DesktopAutoGroup, DesktopGroup } from './group-policy.ts'
import { parseDesktopModels } from './catalog.ts'
import type { DesktopModel } from './catalog.ts'
import { NovaFlowRelayBroker } from './relay-broker.ts'
import type { RelayAccess } from './relay-broker.ts'
import { accountFailure, NovaFlowReadError, NovaFlowUnauthorizedError, readAccountJson } from './account-errors.ts'
import { NovaFlowAuthError } from './auth-protocol.ts'

const MAX_CATALOG_BYTES = 2 * 1024 * 1024

/** Renderer-safe catalog, with no account credential or management capabilities. */
export interface DesktopCatalogView {
  readonly group: string
  readonly groups: readonly DesktopGroup[]
  /** Automatic routing offered to the account; null when the site does not offer it. */
  readonly auto: DesktopAutoGroup | null
  /** Concrete groups the device's requests use, in order; empty when none is usable now. */
  readonly routeGroups: readonly string[]
  readonly models: readonly DesktopModel[]
}

/** Native refresh dependencies; the bearer resolver is never exposed to renderer IPC. */
export interface CatalogControllerOptions {
  readonly access: () => Promise<RelayAccess>
  /** Reads the selected server origin for every request. */
  readonly origin: () => string
  readonly fetch: typeof globalThis.fetch
  readonly relay: NovaFlowRelayBroker
  /** Optional account protocol reader; it returns only validated, credential-free metadata. */
  readonly readCatalog?: (origin: string, access: RelayAccess, signal: AbortSignal) => Promise<DesktopCatalogView>
}

/** Owns one generation of account-bound discovery; stale and interrupted reads never reopen relay admission. */
export class NovaFlowCatalogController {
  private generation = 0
  private active: AbortController | undefined
  private view: DesktopCatalogView | undefined

  constructor(private readonly options: CatalogControllerOptions) {}

  /** @returns the last complete renderer-safe catalog, or undefined while unavailable. */
  getSnapshot(): DesktopCatalogView | undefined { return this.view }

  /** Fence pending reads and relay admission before sign-out or an explicit server-side group mutation. */
  clear(): void {
    this.generation++
    this.active?.abort()
    this.active = undefined
    this.view = undefined
    this.options.relay.suspend()
  }

  /**
   * Retrieve groups and models using one device grant, then recheck the current account before publication.
   * @returns the complete renderer-safe catalog committed to the relay broker.
   * @throws {NovaFlowUnauthorizedError} When the server rejects the access token.
   */
  async refresh(): Promise<DesktopCatalogView> {
    this.clear()
    const generation = this.generation
    const controller = new AbortController()
    this.active = controller
    try {
      const access = await this.options.access()
      routingGroup(access.group)
      controller.signal.throwIfAborted()
      const origin = this.options.origin()
      const view = this.options.readCatalog === undefined
        ? await this.readNativeCatalog(origin, access, controller.signal)
        : await this.options.readCatalog(origin, access, controller.signal)
      const { group, groups, auto, models } = view
      const allowed = [...groups.map(item => item.name), ...auto === null ? [] : [AUTO_GROUP]]
      allowedGroup(group, allowed)
      const current = await this.options.access()
      if (generation !== this.generation || current.deviceSessionId !== access.deviceSessionId || current.group !== group) {
        throw new Error('novaflow: account changed during discovery')
      }
      controller.signal.throwIfAborted()
      this.options.relay.configure({ deviceSessionId: access.deviceSessionId, group, allowedGroups: allowed, models })
      this.view = view
      return view
    } catch (refreshError) {
      controller.abort()
      if (refreshError instanceof NovaFlowUnauthorizedError || refreshError instanceof NovaFlowAuthError) throw refreshError
      throw new NovaFlowReadError(accountFailure(refreshError, 'catalog_unavailable'), 'novaflow: account catalog unavailable')
    } finally {
      if (this.active === controller) this.active = undefined
    }
  }

  private async readNativeCatalog(origin: string, access: RelayAccess, signal: AbortSignal): Promise<DesktopCatalogView> {
    const readsController = new AbortController()
    const request: RequestInit = {
      headers: { authorization: `Bearer ${access.accessToken}`, accept: 'application/json' },
      signal: AbortSignal.any([signal, readsController.signal, AbortSignal.timeout(15_000)]), redirect: 'error', credentials: 'omit', cache: 'no-store',
    }
    const reads = [
      readAccountJson(this.options.fetch, `${origin}/api/desktop/v1/groups`, request, MAX_CATALOG_BYTES),
      readAccountJson(this.options.fetch, `${origin}/api/desktop/v1/models`, request, MAX_CATALOG_BYTES),
    ]
    const [groupsJson, modelsJson] = await Promise.all(reads).catch(async (error: unknown) => {
      readsController.abort()
      await Promise.allSettled(reads)
      throw error
    })
    const { groups, auto } = parseDesktopGroups(groupsJson)
    const allowed = [...groups.map(item => item.name), ...auto === null ? [] : [AUTO_GROUP]]
    const group = allowedGroup(access.group, allowed)
    const { routeGroups, models } = parseDesktopModels(modelsJson, group)
    return Object.freeze({ group, groups, auto, routeGroups, models })
  }
}
