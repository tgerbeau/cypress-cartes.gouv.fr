# Cypress E2E Test Project for cartes.gouv.fr

A comprehensive end-to-end testing suite for cartes.gouv.fr using Cypress.

## 📋 Prerequisites

- Node.js (v16 or higher)
- npm or yarn

## 🚀 Getting Started

### Installation

```bash
npm install
```

### Running Tests

**Open Cypress Test Runner (Interactive Mode):**
```bash
npm run cypress:open
```

**Run Tests in Headless Mode:**
```bash
npm test
# or
npm run cypress:run
```

**Run Tests in Specific Browser:**
```bash
npm run test:chrome
npm run test:firefox
```

**Run Tests with Browser Visible:**
```bash
npm run test:headed
```

**Run Specific Test File:**
```bash
npm run test:spec -- "cypress/e2e/homepage.cy.js"
```

## 📁 Project Structure

```
cypress-cartes.gouv.fr/
├── cypress/
│   ├── e2e/                    # Test files
│   │   ├── homepage.cy.js      # Homepage tests
│   │   ├── navigation.cy.js    # Navigation tests
│   │   ├── search.cy.js        # Search functionality tests
│   │   └── accessibility.cy.js # Accessibility tests
│   ├── fixtures/               # Test data
│   │   └── example.json
│   ├── support/                # Support files
│   │   ├── commands.js         # Custom commands
│   │   └── e2e.js             # Global configuration
│   ├── screenshots/            # Auto-generated screenshots (on failure)
│   └── videos/                 # Auto-generated test videos
├── cypress.config.js           # Cypress configuration
├── package.json
└── README.md
```

## 🧪 Test Suites

### Homepage Tests (`homepage.cy.js`)
- Loads homepage successfully
- Displays main content
- Validates page title
- Tests responsive design

### Navigation Tests (`navigation.cy.js`)
- Verifies navigation menu exists
- Tests navigation links
- Validates page transitions

### Search Tests (`search.cy.js`)
- Tests search input field
- Validates search typing
- Checks search results display

### Accessibility Tests (`accessibility.cy.js`)
- Validates HTML structure
- Checks image alt attributes
- Tests heading hierarchy
- Validates keyboard navigation

## ⚙️ Configuration

The Cypress configuration is in [cypress.config.js](cypress.config.js):

- **Base URL:** `https://cartes.gouv.fr`
- **Viewport:** 1280x720
- **Video:** Enabled
- **Screenshots:** On failure

To modify these settings, edit the configuration file.

## 🛠️ Custom Commands

Add custom Cypress commands in [cypress/support/commands.js](cypress/support/commands.js):

```javascript
Cypress.Commands.add('login', (email, password) => {
  // Custom login command
})
```

## 📊 Test Reports

- **Videos:** Saved in `cypress/videos/`
- **Screenshots:** Saved in `cypress/screenshots/` (on test failure)

## 🎯 Best Practices

1. **Use data-* attributes** for selecting elements in tests
2. **Keep tests independent** - each test should run in isolation
3. **Use Page Object Model** for complex pages
4. **Avoid hardcoding** - use fixtures for test data
5. **Write descriptive test names** - clearly state what is being tested

## 📝 Writing New Tests

Create a new test file in `cypress/e2e/`:

```javascript
describe('Feature Name', () => {
  beforeEach(() => {
    cy.visit('/')
  })

  it('should do something', () => {
    // Your test code
  })
})
```

## 🐛 Debugging

- **Interactive Mode:** Use `npm run cypress:open` to debug tests visually
- **Time Travel:** Click on commands in the Cypress UI to see what happened
- **Console Logs:** Use `cy.log()` for custom logging
- **Pause Execution:** Use `cy.pause()` to pause test execution

## 📚 Resources

- [Cypress Documentation](https://docs.cypress.io)
- [Cypress Best Practices](https://docs.cypress.io/guides/references/best-practices)
- [Cypress API](https://docs.cypress.io/api/table-of-contents)

## 🤝 Contributing

1. Create a new branch for your feature
2. Write tests following the existing patterns
3. Ensure all tests pass
4. Submit a pull request

## 📄 License

ISC
