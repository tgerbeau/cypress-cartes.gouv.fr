# Cypress E2E Test Project — cartes.gouv.fr

## Project Overview
This is a Cypress E2E testing project for **cartes.gouv.fr** (https://cartes.gouv.fr).
The tests run against the production site.

## Tech Stack
- **Cypress 15+** for E2E testing
- **cypress-axe** + **axe-core** for accessibility testing (WCAG 2.1 AA)
- **mochawesome** for test reports (JSON → HTML)
- **Node.js 22**

## Development Guidelines
- Follow Cypress best practices for test organization
- Use Page Object Model pattern where appropriate
- Keep tests independent and isolated
- Use appropriate selectors (data-* attributes preferred)
- Maintain clear test descriptions in French when relevant
- Use `cy.intercept()` for API stubbing when needed
- Add `{ timeout: 10000 }` for elements that may load slowly

## File Structure
- Tests go in `cypress/e2e/` — 17 spec files, ~186 test cases
- Fixtures go in `cypress/fixtures/`
- Custom commands go in `cypress/support/commands.js`
- Global config in `cypress/support/e2e.js`
- Reports in `cypress/reports/` (JSON + HTML)

## Custom Commands
- `cy.acceptCookies()` — clicks the cookie banner if present
- `cy.dismissModal()` — closes the "Bienvenue" modal if present
- `cy.visit()` — overridden to auto-accept cookies and dismiss modal

## Tags
- `@smoke` — critical tests (7 specs, CI hourly on weekdays)
- `@nav`, `@map`, `@catalogue`, `@a11y`, `@api`, `@auth`, `@form`, `@monitoring`, `@crawl`, `@visual`

## Testing Commands
- `npm test` — run all tests headless
- `npm run cypress:open` — open Cypress GUI
- `npm run test:chrome` — run in Chrome
- `npm run test:smoke` — run @smoke tests only
- `npm run test:report` — run + generate HTML report

## CI Workflows (GitHub Actions)
- **smoke-tests.yml** — hourly on weekdays (7h–19h) + push/PR on main → `@smoke` only
- **cypress-daily.yml** — daily at 6h UTC + PR → full suite
- **monitoring.yml** — daily at 7h UTC + push on main → monitoring spec
