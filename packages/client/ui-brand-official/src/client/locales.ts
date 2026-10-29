/** NovaFlow brand and desktop-account dictionaries. */

export const NS = 'hallucodex'

/** Simplified Chinese NovaFlow messages. */
export const zh = {
  'brand.name': 'NovaFlow',
  'account.signIn': '登录 NovaFlow',
  'account.signingIn': '正在登录…',
  'account.open': 'NovaFlow 账号',
} satisfies Record<string, string>

/** Translation keys owned by the NovaFlow namespace. */
export type NovaFlowKey = keyof typeof zh

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** NovaFlow brand and desktop-account copy. */
    hallucodex: NovaFlowKey
  }
}

/** English NovaFlow messages. */
export const en = {
  'brand.name': 'NovaFlow',
  'account.signIn': 'Sign in to NovaFlow',
  'account.signingIn': 'Signing in…',
  'account.open': 'NovaFlow account',
} satisfies Record<NovaFlowKey, string>
