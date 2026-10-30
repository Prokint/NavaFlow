import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, it, onTestFinished } from 'vitest'
import { LEGACY_DESKTOP_BRAND } from '@deepseek-ai/dsh-desktop-host/novaflow'
import { novaFlowDataFile, resolveNovaFlowDataDirectories } from '../src/brand-compat.ts'

it('uses NovaFlow directories on fresh installs and preserves existing private account data in place', () => {
  const root = mkdtempSync(join(tmpdir(), 'novaflow-brand-'))
  onTestFinished(() => { rmSync(root, { recursive: true, force: true }) })
  const home = join(root, 'home')
  const appData = join(root, 'apps')
  const modern = { home: join(home, '.novaflow'), userData: join(appData, 'novaflow') }
  expect(resolveNovaFlowDataDirectories(home, appData)).toEqual(modern)
  const previous = { home: join(home, `.${LEGACY_DESKTOP_BRAND}`), userData: join(appData, LEGACY_DESKTOP_BRAND) }
  mkdirSync(previous.home, { recursive: true })
  mkdirSync(join(previous.userData, 'new-api-account'), { recursive: true, mode: 0o700 })
  const encrypted = join(previous.userData, 'new-api-account', 'refresh.enc')
  writeFileSync(encrypted, Buffer.from([1, 4, 9]), { mode: 0o600 })
  expect(resolveNovaFlowDataDirectories(home, appData)).toEqual(previous)
  const oldSetting = join(previous.userData, `${LEGACY_DESKTOP_BRAND}-server.json`)
  writeFileSync(oldSetting, '{}')
  expect(novaFlowDataFile(previous.userData, 'server.json')).toBe(oldSetting)
  expect(novaFlowDataFile(previous.userData, 'release.json')).toBe(join(previous.userData, 'novaflow-release.json'))
  expect(readFileSync(encrypted)).toEqual(Buffer.from([1, 4, 9]))
  mkdirSync(modern.home)
  mkdirSync(modern.userData)
  expect(resolveNovaFlowDataDirectories(home, appData)).toEqual(modern)
  const modernSetting = join(previous.userData, 'novaflow-server.json')
  writeFileSync(modernSetting, '{}')
  expect(novaFlowDataFile(previous.userData, 'server.json')).toBe(modernSetting)
  expect(readFileSync(encrypted)).toEqual(Buffer.from([1, 4, 9]))
})
