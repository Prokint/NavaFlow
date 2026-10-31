---
kind: upgrade-guide
description: NovaFlow desktop workspaces and plugin activation become account-specific instead of shared across logins.
---

# NovaFlow account workspaces

English | [中文](guide.zh.md)

## Change

NovaFlow selects separate workspaces, sessions and plugin settings for each site/user ID. Signing out no longer leaves the previous account's sidebar visible. New accounts start with third-party plugins disabled. Account switching closes the previous workspace and stops its Host.

## Migration

1. Leave the current account's encrypted login record in place before upgrading. NovaFlow binds existing data to that saved identity; existing workspace and session files stay in place.
2. If the system credential store cannot be read, unlock it and restart NovaFlow. If no login record exists, old files remain unassigned and are never automatically given to a later login. Preserve them for deliberate manual recovery.
3. Sign into another account. Confirm its sidebar is fresh, and enable only the plugins that account needs. Return to the original account to confirm its workspace and plugin choices are restored.
4. For CLI plugin maintenance, fully quit Desktop and explicitly set `DSH_HOME` to the account's directory. See [account paths and limitations](../../../../apps/desktop/novaflow/README.md#account-workspaces).
