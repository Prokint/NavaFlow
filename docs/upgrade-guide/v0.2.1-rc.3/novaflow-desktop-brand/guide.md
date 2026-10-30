---
kind: upgrade-guide
description: Desktop release tags, installer names, and application identifiers use the NovaFlow brand.
---

# NovaFlow desktop release identity

English | [中文](guide.zh.md)

## Change

Desktop releases use `novaflow-v<version>` tags, `novaflow-*` installer filenames, and application ID `com.novaflow.desktop`. The release workflow is [novaflow-desktop-release.yml](../../../../.github/workflows/novaflow-desktop-release.yml). Automation using the preceding brand's release names must change with the workflow. The repository remains `Prokint/NavaFlow`.

Fresh installations use `~/.novaflow` and the platform's `novaflow` application-data directory. Existing desktop data and account settings stay at their existing paths. Recorded model routes remain callable through compatibility aliases; new model selections use NovaFlow routes. Session files and encrypted account records are not rewritten.

Servers implementing the optional desktop authorization extension must accept client ID `novaflow-desktop`. Standard New API account-session login and the selected relay URL are unchanged.

## Migration

1. Update release automation and download references to the NovaFlow tag and filename patterns. Configure signing identities for `com.novaflow.desktop` before publishing.
2. Quit the preceding desktop application before opening the new build when they share existing data. Keep any explicit `DSH_HOME` setting; the new build honors it.
3. Confirm that the account, workspaces, and existing conversations appear. New installations should create NovaFlow directories. The original DeepSeek Harness data and system `dsh` command are independent.
