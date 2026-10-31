# Local package branding tool

English | [中文](README.zh.md)

This tool applies NovaFlow display branding to an existing upstream macOS package for reproduction and review. Use the repository TypeScript sources for ongoing development.

```sh
python3 customizations/novaflow/rebrand-installed.py \
  --source-app /path/to/Upstream.app --source-name Upstream \
  --output-app /path/to/local-output/NovaFlow.app
```

Requires macOS, Python 3, and Node.js. The output directory must not exist. The tool copies the application, replaces display branding, preserves images, protocol identifiers, and data directories, updates ASAR integrity records, and disables the original update source. It does not modify the input application or read local accounts or sessions.

The output application and its helpers still require local signing with `codesign`. Distribution separately requires signing, notarization, and installed-application verification. Do not commit the output application or its `changes.json` build report to this source repository.

`apply-built.py --app /path/to/NovaFlow.app --backup /path/to/new-backup` replaces built first-party modules in a fully stopped local package, records a backup and refreshes runtime and ASAR integrity. For a package that still uses a previous Host module basename, pass `--previous-module-name <basename>`; the tool renames its two archive entries and updates the runtime manifest and package exports. The backup directory must not exist. Re-sign the application before launching it.

## Current logo assets

The selected black-and-gray mark is stored at `design/brand/novaflow-symbol-transparent.png`, alongside the selected reference and extraction prompt. Run `node customizations/novaflow/prepare-logo.mjs` to generate desktop icons, the sidebar mark, favicon, and installer artwork; then run the Linux and tray render commands in the desktop guide. A white rounded backplate keeps the same artwork legible in light and dark themes.

`apply-logo.py` updates prepared assets in a stopped local macOS app using `--app`, `--icns`, and a new `--backup` directory. It preserves the original package, updates the embedded mark and integrity records, and requires re-signing before launch. Source builds let electron-builder generate platform icons directly from the new PNGs.
