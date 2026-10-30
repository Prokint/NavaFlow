/** Generate the NovaFlow desktop and client logo assets from the selected transparent master. */
import { createRequire } from 'node:module'
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const require = createRequire(new URL('../../apps/desktop/package.json', import.meta.url))
const sharp = require('sharp')
const root = new URL('../../', import.meta.url)
const master = await readFile(new URL('design/brand/novaflow-symbol-transparent.png', root))
const mark = await sharp(master).trim().resize(1024, 1024, {
  fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 },
}).png().toBuffer()
const embedded = `data:image/png;base64,${mark.toString('base64')}`

function platformSvg(platform) {
  const mac = platform === 'macos'
  const plate = mac ? 824 : 960
  const inset = (1024 - plate) / 2
  const glyph = mac ? 640 : 744
  const markInset = (1024 - glyph) / 2
  const shadow = mac ? `<defs><filter id="shadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="12" stdDeviation="14" flood-opacity="0.18"/></filter></defs>` : ''
  return `<svg width="1024" height="1024" viewBox="0 0 1024 1024" fill="none" xmlns="http://www.w3.org/2000/svg">
${shadow}
<g id="tray-glyph"${mac ? ' filter="url(#shadow)"' : ''}>
<rect x="${inset}" y="${inset}" width="${plate}" height="${plate}" rx="${mac ? 184 : 208}" fill="white"/>
<image x="${markInset}" y="${markInset}" width="${glyph}" height="${glyph}" href="${embedded}"/>
</g>
</svg>
`
}

for (const platform of ['windows', 'macos']) {
  const svg = platformSvg(platform)
  const path = new URL(`apps/desktop/resources/icon-${platform}`, root)
  await writeFile(`${fileURLToPath(path)}.svg`, svg)
  await sharp(Buffer.from(svg)).png().toFile(`${fileURLToPath(path)}.png`)
}
const client = await sharp(Buffer.from(platformSvg('windows'))).resize(128, 128).webp({ lossless: true }).toBuffer()
await writeFile(new URL('packages/client/ui-brand-official/src/client/mark-image.ts', root),
  `/** NovaFlow black-and-gray symbol on a white backplate, encoded as a lossless 128-pixel WebP. */\nexport const NOVAFLOW_MARK_IMAGE = 'data:image/webp;base64,${client.toString('base64')}'\n`)
await writeFile(new URL('apps/web/public/favicon.svg', root), platformSvg('windows'))
for (const dark of [false, true]) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="196"><rect width="600" height="196" fill="${dark ? '#17191d' : '#ffffff'}"/><rect x="32" y="34" width="128" height="128" rx="28" fill="white"/><image x="44" y="46" width="104" height="104" href="${embedded}"/><text x="188" y="116" font-family="Arial, sans-serif" font-size="49" font-weight="600" letter-spacing="-1.2" fill="${dark ? 'white' : '#141517'}">NovaFlow</text></svg>`
  for (const scale of [1, 2]) {
    const name = `brand${dark ? '-dark' : ''}${scale === 2 ? '-2x' : ''}.png`
    await sharp(Buffer.from(svg), { density: 72 * scale }).png().toFile(fileURLToPath(new URL(`apps/desktop/installer/assets/${name}`, root)))
  }
}
const sidebar = `<svg xmlns="http://www.w3.org/2000/svg" width="164" height="314"><rect width="164" height="314" fill="#f5f5f6"/><image x="24" y="80" width="116" height="116" href="${embedded}"/><text x="82" y="230" text-anchor="middle" font-family="Arial, sans-serif" font-size="23" font-weight="600" letter-spacing="-0.6" fill="#141517">NovaFlow</text></svg>`
await sharp(Buffer.from(sidebar)).png().toFile(fileURLToPath(new URL('apps/desktop/installer/assets/uninstaller-sidebar.png', root)))
console.info('NovaFlow: generated desktop, client, favicon, and installer artwork from the selected master.')
