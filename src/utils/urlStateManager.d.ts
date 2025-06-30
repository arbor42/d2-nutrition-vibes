export interface URLStateManager {
  initializeFromURL(): void
  updateURL(params: Record<string, any>): void
  getStateFromURL(): Record<string, any>
  setStateToURL(state: Record<string, any>): void
  watchForChanges(callback: (state: Record<string, any>) => void): void
  init(): void
}

export declare const urlStateManager: URLStateManager