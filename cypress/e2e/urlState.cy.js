// URL State Service – E2E Smoke-Test
// ------------------------------------------------
// Prüft, ob bei vorgegebenen Query-Parametern die UI-Klasse "dark" gesetzt
// und das Simulation-Panel geladen wird.

describe('URL State Deep-Linking', () => {
  it('stellt Zustand anhand der URL wieder her', () => {
    // Deep-Link mit Dark-Mode, Sidebar offen und Simulation-Panel
    const url = '/?dark=1&sb=1&pnl=simulation'

    cy.visit(url)

    // Dark-Mode sollte <html class="dark"> setzen
    cy.get('html').should('have.class', 'dark')

    // Sidebar sollte sichtbar sein (NavigationSidebar existiert)
    cy.get('nav').should('be.visible')

    // Überschrift des Simulation-Panels prüfen
    cy.contains('h2', /Simulationen/i).should('be.visible')
  })
}) 