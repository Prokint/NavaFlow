# Agent Note: NovaFlow isolates desktop workspaces by authenticated identity

Status: implemented

English | [中文](2026-10-31-novaflow-account-workspaces.zh.md)

## Problem

Site login previously changed model access while retaining a shared local workspace registry, session history and enabled plugins. Switching people on the same desktop could expose another person's sessions and run their configured extensions.

## Decision

Native code hashes the exact site origin and server-issued user ID to select a desktop home and browser partition. It stops the previous Host and renderer before admitting the next account, and rotates the private relay capability. A failed teardown never opens another account over the old process. User-initiated switches confirm interruption of active or scheduled tasks.

The first encrypted login record binds legacy data before refresh can expire or replace it. A first-launch record with no owner permanently prevents arbitrary later logins from adopting old data. Credential-read failures stop initialization rather than sealing an absent owner. The legacy owner's immutable session files, workspace paths and browser partition stay in place.

Fresh authenticated profiles can inherit installed package payloads through passive filesystem copying, but start with only base and Web bundles and no inherited plugin patches or secrets. Returning profiles retain their own choices. First-use workspace files live in distinct directories as well as distinct registries. The [account reference](../../../../apps/desktop/novaflow/README.md#account-workspaces) owns paths and operational behavior.

## Alternatives considered

**Filtering the sidebar by account** leaves session APIs, credentials, enabled plugins and background processes shared. Separate Host homes make those existing storage readers select the same identity without changing each plugin's persistence schema.

**Assigning old data to the first new login** can hand an unidentifiable former user's data to a different person. Preserving unassigned files costs automatic recovery when no trusted saved identity exists, but never guesses ownership.

**Sharing the previous plugin profile** preserves activation and secrets across people. Running package installation again can execute third-party scripts before the new user chooses to enable a plugin. Passive package copying preserves availability without either behavior.

## Consequences

Switching requires a Host restart and new profiles consume additional disk space. Application account isolation does not restrict the OS user's filesystem privileges. Tests cover independent directories, passive disabled-plugin inheritance, legacy adoption, failed migration, relay admission, serial teardown, superseded switches and native A-to-B-to-A window ownership. Existing account UI snapshots remain applicable because the sign-in UI is unchanged.
