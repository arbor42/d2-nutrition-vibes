import { describe, it, expect, vi } from 'vitest'
import UrlStateService from '@/services/urlState'
import { useUIStore } from '@/stores/useUIStore'

// Einfacher Mock-Router, der nur die minimal benötigten Eigenschaften bereitstellt
function createMockRouter() {
  return {
    replace: vi.fn(),
    currentRoute: {
      value: {
        query: {}
      }
    }
  }
}

describe('UrlStateService – Phase 1', () => {
  it('kann ohne Fehler initialisiert werden', () => {
    const mockRouter = createMockRouter()
    UrlStateService.init(mockRouter)
    expect(UrlStateService.router).toBe(mockRouter)
  })

  it('liefert beim Serialisieren ein URLSearchParams-Objekt', () => {
    const params = UrlStateService.serialize()
    expect(params).toBeInstanceOf(URLSearchParams)
    expect(Array.from(params.keys()).length).toBe(0)
  })

  it('akzeptiert URLSearchParams in deserialize()', () => {
    const query = new URLSearchParams('dark=1')
    expect(() => UrlStateService.deserialize(query)).not.toThrow()
  })

  it('setzt Store-Werte korrekt aus Query', () => {
    const ui = useUIStore()
    // Sicherstellen Ausgangszustand
    // @ts-ignore – $reset ist Pinia intern
    ui.$reset?.()

    const query = new URLSearchParams('dark=1&sb=1&pnl=simulation')
    UrlStateService.deserialize(query)

    expect(ui.darkMode).toBe(true)
    expect(ui.sidebarOpen).toBe(true)
    expect(ui.currentPanel).toBe('simulation')
  })
}) 