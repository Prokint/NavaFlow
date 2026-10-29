/** Navigation into the settings shell, provided by its presentation owner. */
export interface SettingsNavigation {
  /**
   * Open settings, optionally selecting a registered section.
   * @param section - Settings section ID; omission keeps the current selection.
   */
  open(section?: string): void
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    /** Settings shell navigation shared by product entry points. */
    settingsNavigation: SettingsNavigation
  }
}
