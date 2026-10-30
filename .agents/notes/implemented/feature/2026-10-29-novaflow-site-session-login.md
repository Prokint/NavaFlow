# Agent Note: NovaFlow uses the site's account session for model access

Status: implemented

English | [中文](2026-10-29-novaflow-site-session-login.zh.md)

## Problem

The selected New API site supports account login and inference but does not implement the inherited desktop authorization extension. Requiring users to create and copy a model API key leaves desktop account sign-in disconnected from model access.

## Decision

NovaFlow opens the site's first-party sign-in page in a sandboxed, nonpersistent Electron partition. The window allows only same-origin navigation and exposes no preload or Node integration. Its trusted title identifies the site. The page performs the site's existing password and additional verification; native code receives only the matching HttpOnly refresh cookie after successful login.

The native broker exchanges that cookie through the site's refresh endpoint. It keeps the short-lived dashboard access token in memory and saves only the refresh grant through OS-backed encryption in a separate account directory. Issuer bindings keep cancellation and revocation credentials on their original site. Closing or cancelling login clears the owned temporary partition. Logout clears local admission and revokes the site session.

Account discovery intersects the user's current-group model list with the site's advertised Chat Completions support. The existing private desktop relay maps that protocol to the account-authenticated `/pg/chat/completions` endpoint. No model or management API key is created. A missing initial model selection adopts the first available account model; an existing API-key selection is retained.

## Alternatives considered

Automatically creating a model API key requires additional persistent access, quota and revocation management. The site's existing session gateway supplies the required account access without that extra credential. Embedding a username/password form duplicates the site's password encryption and multifactor flows; loading its own isolated page preserves those checks. System-browser login cannot supply the site's HttpOnly refresh cookie without a server callback extension.

## Consequences

Users sign in once and the desktop restores the encrypted session on restart. The account session supports streaming Chat Completions and tools; Responses and Anthropic endpoints remain available through the optional API-key provider settings. Account quota remains server-authoritative. The UI hides device-specific meters because the site session has no separate device budget. The legacy desktop protocol and its encrypted directory remain separate from the standard site-session implementation.

Focused tests cover refresh-only persistence projection, issuer pinning, account-scoped discovery, stream relay, restart, logout, cancellation and isolated-window cleanup. Native login and model access use the selected site's own account and balance rather than a shared application credential.
