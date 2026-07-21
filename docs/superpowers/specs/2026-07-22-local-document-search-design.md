# Local Document Search Design

## Goal

Add a local full-text search experience to the documentation site without an external API or search service. The search entry should appear in the top-right navigation, match the existing visual language, and support fast keyboard-driven navigation.

## Scope

The search index includes document titles, level-two and level-three headings, and prose content. It excludes code blocks, navigation, sidebars, footers, and other repeated interface text.

The search interface provides:

- A full search button in the desktop navigation, labelled `搜索文档` and showing the platform shortcut.
- A compact search icon on narrow screens.
- `Command+K` on macOS and `Ctrl+K` on other platforms to open the modal.
- Arrow-key result selection, Enter to navigate, and Escape to close.
- Results containing the page title, section path, excerpt, and a page or heading URL.
- Chinese and English full-text queries.

The feature does not include remote search analytics, query suggestions from a server, authenticated content, or cross-site search.

## Architecture

Pagefind will build the index from the final static HTML. The production build flow is:

1. Next.js renders and exports the documentation site to `out/`.
2. Pagefind scans `out/` and writes its static search bundle to `out/pagefind/`.
3. Vercel deploys the exported pages and search bundle together.
4. The browser loads the Pagefind JavaScript API only when the search modal is first opened.

This keeps indexing independent of MDX parsing and ensures the index represents the content users actually see. Pagefind has no server-side runtime dependency.

## Components

### Search trigger

The top-level layout renders the search trigger inside `Navigation`. On desktop it uses the selected full-width design with a search icon, `搜索文档`, and the keyboard shortcut. At the existing narrow-screen breakpoint it becomes an icon-only button so it does not crowd the library selector.

### Search modal

A focused React component owns modal visibility, query text, result selection, loading state, and error state. It registers the global keyboard shortcut only in the browser and removes the listener on unmount.

Opening the modal moves focus to the search input. Closing it returns focus to the element that opened it. The modal uses dialog semantics and labels its input and result list for assistive technology.

### Pagefind adapter

A small adapter dynamically imports `/pagefind/pagefind.js`, initializes it once, and exposes a search function to the UI. Keeping Pagefind-specific behavior behind this adapter allows the React component to be tested without loading a production index.

Each result is normalized into a stable UI model containing a URL, page title, section title, excerpt, and score. Heading-level Pagefind sub-results are flattened so Enter can navigate directly to a matching anchor.

## Index Boundaries

The documentation article is marked as Pagefind's searchable body. Repeated site chrome remains outside that boundary. Code block wrappers receive `data-pagefind-ignore`, and the documentation sub-footer is excluded as well.

The existing `zh-CN` document language remains in place so Pagefind uses its Chinese segmentation support. Page titles and heading text are retained in the index and receive greater search weight than ordinary prose.

## Build and Development Behavior

The production `build` script runs Pagefind only after `next export` succeeds. A separate local preview command builds, indexes, and serves `out/` for end-to-end search testing.

The regular Next.js development server does not have a generated Pagefind bundle. In that environment, opening search shows a concise message directing the developer to use the indexed preview command. Missing development assets must not crash the page or affect navigation.

## Search States and Error Handling

- An empty query displays a short prompt and does not call Pagefind.
- While Pagefind or a query is loading, the modal shows a loading state.
- A query with no matches displays `未找到相关文档`.
- An index load failure displays an actionable message and a retry control.
- Query sequence tracking prevents a slower, older query from replacing newer results.
- Result excerpts are rendered as Pagefind-provided highlighted markup only through a narrowly scoped rendering path.

## Dependency Cleanup

The unused Algolia DocSearch component, `@docsearch/react` dependency, DocSearch stylesheet imports, and `DOCSEARCH_API_KEY` build configuration are removed. The existing search-related site styles may be reused only where they apply to the new local interface; obsolete Algolia selectors are removed.

## Verification

Component-level tests cover:

- Trigger click and global keyboard shortcut behavior.
- Focus movement and restoration.
- Arrow-key selection, Enter navigation, and Escape closing.
- Empty, loading, no-result, failure, retry, and successful-result states.
- Protection against stale asynchronous results.
- Desktop labels and narrow-screen accessible labels.

Production verification covers:

- Lint and the full static production build.
- A non-empty Pagefind index generated under `out/pagefind/`.
- Successful Chinese queries such as `时间轴` and English queries such as `SQLite`.
- Direct navigation to a matching heading anchor.
- Browser inspection of desktop and mobile navigation layouts.
- Confirmation that code-only terms do not appear in results.

## Acceptance Criteria

The feature is complete when a deployed static build provides the selected full search trigger, opens from pointer and keyboard input, returns relevant local results for Chinese and English documentation content, navigates to pages and matching headings, excludes code blocks and repeated site chrome, and handles unavailable indexes without breaking the page.
