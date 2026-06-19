# Cypress E2E Tests — cartes.gouv.fr

Suite de tests end-to-end pour [cartes.gouv.fr](https://cartes.gouv.fr) avec Cypress.
Les tests s'exécutent contre le site de production.

**401 tests** répartis dans **18 fichiers specs**.

## Prérequis

- **Node.js 22**
- npm

## Installation

```bash
npm install
```

## Lancer les tests

```bash
# Tous les tests (headless)
npm test

# Interface graphique Cypress
npm run cypress:open

# Dans Chrome
npm run test:chrome

# Un fichier spécifique
npm run test:spec -- "cypress/e2e/homepage.cy.js"

# Par tag
npm run test:smoke       # Tests critiques (CI horaire)
npm run test:a11y        # Accessibilité (RGAA + axe-core)
npm run test:api         # Endpoints API
npm run test:map         # Carte / OpenLayers
npm run test:nav         # Navigation / pages
npm run test:catalogue   # Catalogue de données
npm run test:auth        # Authentification SSO
npm run test:form        # Formulaires
npm run test:monitoring  # Monitoring uptime
npm run test:crawl       # Crawler de liens
npm run test:visual      # Audit visuel (NNG, cibles tactiles)
```

### Rapports Mochawesome

```bash
npm run test:report      # Lancer + générer le rapport HTML
npm run report           # Générer le rapport à partir des JSON existants
```

Le rapport HTML est dans `cypress/reports/html/report.html`.

## Structure du projet

```
cypress/
├── e2e/                              # Fichiers de test (*.cy.js)
│   ├── homepage.cy.js                # @nav @smoke — Page d'accueil
│   ├── navigation.cy.js              # @nav @smoke — Navigation & liens
│   ├── error-pages.cy.js             # @nav @smoke — Pages d'erreur (404, etc.)
│   ├── map.cy.js                     # @map @smoke — Carte interactive (OpenLayers)
│   ├── map-tools.cy.js               # @map @smoke — Outils cartographiques
│   ├── editeur-carto.cy.js           # @map — Éditeur cartographique
│   ├── catalogue-donnees.cy.js       # @catalogue @smoke — Catalogue de données
│   ├── dataset-detail.cy.js          # @catalogue — Fiche détail d'un jeu de données
│   ├── api-data.cy.js                # @api @smoke — Endpoints API (Géoplateforme)
│   ├── accessibility.cy.js           # @a11y — Audit accessibilité (page d'accueil)
│   ├── a11y-secondary-pages.cy.js    # @a11y — Audit accessibilité (pages secondaires)
│   ├── rgaa-criteres.cy.js           # @a11y — 106 critères RGAA 4.1.2 (13 thématiques)
│   ├── nng-accessibility-audit.cy.js # @visual — Audit visuel NNG
│   ├── show-small-targets.cy.js      # @visual — Détection cibles tactiles trop petites
│   ├── forms.cy.js                   # @form — Formulaires
│   ├── auth.cy.js                    # @auth — Authentification SSO (Géoplateforme)
│   ├── monitoring.cy.js              # @monitoring — Monitoring uptime & disponibilité
│   └── site-crawler.cy.js            # @crawl — Crawler de liens internes
├── fixtures/                         # Données de test (JSON)
├── support/
│   ├── commands.js                   # Commandes custom
│   └── e2e.js                        # Setup global (cypress-axe, override cy.visit)
├── reports/                          # Rapports mochawesome (JSON + HTML)
├── screenshots/                      # Captures d'écran (en cas d'échec)
└── videos/                           # Vidéos des tests
scripts/
├── generate-rgaa-report.js           # Génère le rapport RGAA HTML
└── generate-rgaa-pdf.js              # Génère le rapport RGAA PDF
```

## Commandes custom

| Commande | Description |
|----------|------------|
| `cy.acceptCookies()` | Accepte la bannière cookies DSFR si présente |
| `cy.dismissModal()` | Ferme la modale "Bienvenue" si présente |
| `cy.visit()` | Surchargé : accepte cookies + ferme modale automatiquement |

## Tags disponibles

| Tag | Specs | Tests | Description |
|-----|-------|-------|-------------|
| `@smoke` | 7 specs | 10 | Tests critiques, exécutés en CI chaque heure (jours ouvrés) |
| `@nav` | 3 specs | 20 | Navigation, pages statiques, erreurs |
| `@map` | 3 specs | 22 | Carte OpenLayers, outils, éditeur |
| `@catalogue` | 2 specs | 12 | Catalogue et fiches de données |
| `@a11y` | 3 specs | 279 | Audits accessibilité WCAG 2.1 AA + RGAA 4.1.2 |
| `@api` | 1 spec | 5 | Endpoints Géoplateforme |
| `@auth` | 1 spec | 5 | Authentification SSO |
| `@form` | 1 spec | 9 | Formulaires |
| `@monitoring` | 1 spec | 10 | Monitoring uptime |
| `@crawl` | 1 spec | 5 | Crawler de liens |
| `@visual` | 2 specs | 34 | Audit visuel (taille cibles, contraste NNG) |

## CI / GitHub Actions

| Workflow | Déclencheur | Cible |
|----------|------------|-------|
| **smoke-tests.yml** | Push/PR sur `main` + cron horaire (7h–19h, lun–ven) | `@smoke` uniquement |
| **cypress-daily.yml** | Cron quotidien (6h UTC) + PR + manuel | Suite complète |
| **monitoring.yml** | Push sur `main` + cron quotidien (7h UTC) + manuel | `monitoring.cy.js` |

## Stack technique

- **Cypress 15+** — Framework de test E2E
- **cypress-axe** + **axe-core** — Audits accessibilité WCAG 2.1 AA
- **mochawesome** — Rapports de test (JSON → HTML)
- **DSFR** — Design Système de l'État (préfixe `.fr-`)
- **OpenLayers** — Carte interactive (tuiles `data.geopf.fr`, `wxs.ign.fr`)
- **Claude Vision (IA)** — Vérification pertinence des alt et détection images-texte (RGAA 1.3, 1.8)

## Configuration Cypress

- **Base URL :** `https://cartes.gouv.fr`
- **Viewport :** 1280×720
- **Timeout commandes :** 10 s
- **Timeout chargement page :** 120 s
- **Retries CI :** 2 (mode run) / 0 (mode open)
- **Vidéo :** activée
- **Screenshots :** en cas d'échec

## 📚 Resources

- [Cypress Documentation](https://docs.cypress.io)
- [Cypress Best Practices](https://docs.cypress.io/guides/references/best-practices)
- [RGAA 4.1.2 — Critères et tests](https://accessibilite.numerique.gouv.fr/methode/criteres-et-tests/)
- [axe-core Rules](https://github.com/dequelabs/axe-core/blob/develop/doc/rule-descriptions.md)

## 🤝 Contributing

1. Create a new branch for your feature
2. Write tests following the existing patterns
3. Ensure all tests pass
4. Submit a pull request

## 📄 License

ISC
