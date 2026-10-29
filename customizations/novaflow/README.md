# Local package branding tool

English | [中文](README.zh.md)

This tool preserves the original macOS package changes from HalluCodex 0.1.10 to NovaFlow for reproduction and review. Use the repository TypeScript sources for ongoing development.

```sh
python3 customizations/novaflow/rebrand-installed.py \
  --source-app /path/to/HalluCodex.app \
  --output-app /path/to/local-output/NovaFlow.app
```

Requires macOS, Python 3, and Node.js. The output directory must not exist. The tool copies the application, replaces display branding, preserves images, protocol identifiers, and data directories, updates ASAR integrity records, and disables the original update source. It does not modify the input application or read local accounts or sessions.

The output application and its helpers still require local signing with `codesign`. Distribution separately requires signing, notarization, and installed-application verification. Do not commit the output application or its `changes.json` build report to this source repository.
