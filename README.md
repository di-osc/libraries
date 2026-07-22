# di-osc Libraries

Documentation hub for libraries maintained by `di-osc`.

This documentation site is based on the [spaCy website](https://spacy.io/).

## Development

```bash
nvm use
npm install
npm run dev
```

Documentation is written in MDX under `docs/`. Site navigation is configured in
`meta/site.json` and `meta/sidebars.json`.

## Search preview

The regular development server does not generate a search index. To build the
static site, generate its Pagefind index, and start an indexed preview, run:

```bash
npm run preview:search
```

Production builds run Pagefind automatically after Next.js exports the site.
