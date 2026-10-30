/** Prefer existing desktop data over creating an empty account or workspace after a brand rename. */
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { LEGACY_DESKTOP_BRAND } from '@deepseek-ai/dsh-desktop-host/novaflow'

/**
 * Keep existing directories in place; fresh installs use NovaFlow names and never use the original DSH home.
 * @param home - User home directory.
 * @param appData - Platform application-data parent.
 * @returns Chosen harness and Electron storage directories.
 */
export function resolveNovaFlowDataDirectories(home: string, appData: string): { home: string; userData: string } {
  const preferExisting = (modern: string, legacy: string) => existsSync(modern) || !existsSync(legacy) ? modern : legacy
  return {
    home: preferExisting(join(home, '.novaflow'), join(home, `.${LEGACY_DESKTOP_BRAND}`)),
    userData: preferExisting(join(appData, 'novaflow'), join(appData, LEGACY_DESKTOP_BRAND)),
  }
}

/**
 * Keep each existing account setting at its original path; new settings use the NovaFlow prefix.
 * @param directory - Selected Electron user-data directory.
 * @param suffix - Application-owned settings filename after the brand prefix.
 * @returns Existing modern or legacy file, otherwise the new NovaFlow filename.
 */
export function novaFlowDataFile(directory: string, suffix: string): string {
  const modern = join(directory, `novaflow-${suffix}`)
  const legacy = join(directory, `${LEGACY_DESKTOP_BRAND}-${suffix}`)
  return existsSync(modern) || !existsSync(legacy) ? modern : legacy
}
