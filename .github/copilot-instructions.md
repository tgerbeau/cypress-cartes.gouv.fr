# Cypress E2E Test Project — cartes.gouv.fr

## Project Overview
This is a Cypress E2E testing project for **cartes.gouv.fr** (https://cartes.gouv.fr).
The tests run against the production site.

## Tech Stack
- **Cypress 15+** for E2E testing
- **cypress-axe** + **axe-core** for accessibility testing
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
- Tests go in `cypress/e2e/`
- Fixtures go in `cypress/fixtures/`
- Custom commands go in `cypress/support/commands.js`
- Global config in `cypress/support/e2e.js`

## Testing Commands
- `npm test` — run all tests headless
- `npm run cypress:open` — open Cypress GUI
- `npm run test:chrome` — run in Chrome

## Project Status
- ✅ Project initialized
- ✅ Cypress configuration created
- ✅ Basic folder structure set up
- ✅ Example tests provided
