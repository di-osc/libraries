# Local Document Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an API-free Pagefind search button and keyboard-accessible modal that searches the statically exported Chinese and English documentation.

**Architecture:** Pagefind indexes the final `out/` HTML after Next.js export and emits a static bundle deployed with the site. A small adapter lazily loads that bundle, while a focused React component owns modal interaction and renders normalized page and heading results.

**Tech Stack:** Next.js 13, React 18, Pagefind 1.5, Sass modules, Jest 30, Testing Library

---

## File Structure

- Create `jest.config.js`: configure Next-aware Jest transforms and jsdom.
- Create `jest.setup.js`: install Testing Library DOM matchers.
- Create `test/fileMock.js`: stub imported image and font assets.
- Create `src/search/pagefind.js`: lazy-load Pagefind and normalize its result records.
- Create `src/search/pagefind.test.js`: unit-test loading, retry, normalization, and empty queries.
- Replace `src/components/search.js`: render the trigger, modal, search states, and keyboard behavior.
- Create `src/components/search.test.js`: exercise the complete search interaction through a fake client.
- Create `src/styles/search.module.sass`: style the selected full trigger and modal.
- Create `src/components/searchIndexing.test.js`: verify searchable and ignored markup boundaries.
- Modify `src/templates/index.js`: mount search in the fixed navigation.
- Modify `src/templates/docs.js`: exclude the documentation sub-footer from indexing.
- Modify `src/components/main.js`: mark only article content as the Pagefind body.
- Modify `src/components/codeBlock.js`: exclude fenced code blocks from indexing.
- Modify `src/components/title.js`: expose the concise document title as Pagefind metadata.
- Modify `src/components/typography.js`: forward safe DOM attributes from heading components.
- Modify `src/styles/navigation.module.sass`: reserve navigation space and apply the responsive trigger layout.
- Modify `package.json` and `package-lock.json`: replace Algolia, add Pagefind and tests, and extend build scripts.
- Modify `next.config.mjs`: remove the obsolete DocSearch environment exposure.
- Modify `src/styles/layout.sass`: remove obsolete Algolia selectors.
- Modify `src/styles/search.sass`: remove obsolete global DocSearch styling after the Sass module replaces it.
- Modify `README.md`: document indexed preview and production build behavior.

### Task 1: Add the test and indexing toolchain

**Files:**
- Create: `jest.config.js`
- Create: `jest.setup.js`
- Create: `test/fileMock.js`
- Modify: `package.json`
- Modify: `package-lock.json`

- [ ] **Step 1: Install the exact development dependencies**

Run:

```bash
npm install --install-strategy=nested --save-dev pagefind@1.5.2 jest@30.4.2 jest-environment-jsdom@30.4.1 @testing-library/react@16.3.2 @testing-library/jest-dom@7.0.0 @testing-library/user-event@14.6.1 identity-obj-proxy
```

Expected: the listed packages appear under `devDependencies` and `package-lock.json` is updated. `--install-strategy=nested` keeps the test dependencies nested, preserving existing production resolutions in the legacy v2 lockfile. Keep `@docsearch/react` installed through Task 1; the production search component is replaced in Task 3, and the package is uninstalled in Task 5 after that replacement.

- [ ] **Step 2: Add the Jest command to `package.json`**

Add this script without changing the production build yet:

```json
"test": "jest"
```

- [ ] **Step 3: Add the Next-aware Jest configuration**

Create `jest.config.js`:

```js
const nextJest = require('next/jest')

const createJestConfig = nextJest({ dir: './' })

module.exports = createJestConfig({
    testEnvironment: 'jsdom',
    setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
    moduleNameMapper: {
        '^.+\\.module\\.(css|sass|scss)$': 'identity-obj-proxy',
        '^.+\\.(png|jpg|jpeg|gif|webp|avif|ico|bmp|svg|woff|woff2)$': '<rootDir>/test/fileMock.js',
    },
})
```

Create `jest.setup.js`:

```js
require('@testing-library/jest-dom')
```

Create `test/fileMock.js`:

```js
module.exports = 'test-file-stub'
```

- [ ] **Step 4: Verify the empty test harness**

Run: `npm test -- --runInBand --passWithNoTests`

Expected: PASS with zero tests and exit code 0.

- [ ] **Step 5: Commit the toolchain**

```bash
git add package.json package-lock.json jest.config.js jest.setup.js test/fileMock.js
git commit -m "test: add search test harness"
```

### Task 2: Build the Pagefind adapter with TDD

**Files:**
- Create: `src/search/pagefind.test.js`
- Create: `src/search/pagefind.js`

- [ ] **Step 1: Write failing adapter tests**

Create `src/search/pagefind.test.js` with tests that pass a fake loader into `createPagefindClient`:

```js
import { createPagefindClient } from './pagefind'

const pageResult = {
    url: '/asr-data/annotations.html',
    meta: { title: '时间轴与标注' },
    excerpt: '使用 <mark>时间轴</mark> 管理标注',
    sub_results: [
        {
            title: 'Annotation 类型',
            url: '/asr-data/annotations.html#annotation-types',
            excerpt: '常用的 <mark>标注</mark> 类型',
        },
    ],
}

test('returns no results for whitespace without loading Pagefind', async () => {
    const load = jest.fn()
    const client = createPagefindClient(load)
    await expect(client.search('   ')).resolves.toEqual([])
    expect(load).not.toHaveBeenCalled()
})

test('loads once and normalizes heading sub-results', async () => {
    const search = jest.fn().mockResolvedValue({
        results: [{ score: 8, data: jest.fn().mockResolvedValue(pageResult) }],
    })
    const load = jest.fn().mockResolvedValue({ search })
    const client = createPagefindClient(load)

    await expect(client.search('标注')).resolves.toEqual([
        {
            id: '/asr-data/annotations/#annotation-types',
            url: '/asr-data/annotations/#annotation-types',
            title: '时间轴与标注',
            section: 'Annotation 类型',
            excerpt: '常用的 <mark>标注</mark> 类型',
            score: 8,
        },
    ])
    await client.search('时间轴')
    expect(load).toHaveBeenCalledTimes(1)
})

test('retry clears a rejected lazy load', async () => {
    const load = jest
        .fn()
        .mockRejectedValueOnce(new Error('missing index'))
        .mockResolvedValueOnce({ search: jest.fn().mockResolvedValue({ results: [] }) })
    const client = createPagefindClient(load)

    await expect(client.search('SQLite')).rejects.toThrow('missing index')
    client.retry()
    await expect(client.search('SQLite')).resolves.toEqual([])
    expect(load).toHaveBeenCalledTimes(2)
})
```

- [ ] **Step 2: Run the adapter test and verify failure**

Run: `npm test -- --runInBand src/search/pagefind.test.js`

Expected: FAIL because `src/search/pagefind.js` does not exist.

- [ ] **Step 3: Implement the minimal adapter**

Create `src/search/pagefind.js`:

```js
const loadGeneratedPagefind = () => import(/* webpackIgnore: true */ '/pagefind/pagefind.js')

const normalizeResult = async (result) => {
    const data = await result.data()
    const pageTitle = data.meta?.title || data.url
    const subResults = data.sub_results || []

    if (subResults.length) {
        return subResults.map((subResult) => ({
            id: subResult.url.replace(/\.html(?=$|#|\?)/, ''),
            url: subResult.url.replace(/\.html(?=$|#|\?)/, ''),
            title: pageTitle,
            section: subResult.title,
            excerpt: subResult.excerpt,
            score: result.score,
        }))
    }

    return [
        {
            id: data.url.replace(/\.html(?=$|#|\?)/, ''),
            url: data.url.replace(/\.html(?=$|#|\?)/, ''),
            title: pageTitle,
            section: null,
            excerpt: data.excerpt,
            score: result.score,
        },
    ]
}

export const createPagefindClient = (load = loadGeneratedPagefind) => {
    let modulePromise = null

    const getPagefind = () => {
        if (!modulePromise) modulePromise = load().then((module) => module.default || module)
        return modulePromise
    }

    return {
        async search(query) {
            const normalizedQuery = query.trim()
            if (!normalizedQuery) return []
            const pagefind = await getPagefind()
            const response = await pagefind.search(normalizedQuery)
            return (await Promise.all(response.results.map(normalizeResult))).flat()
        },
        retry() {
            modulePromise = null
        },
    }
}

export const pagefindClient = createPagefindClient()
```

- [ ] **Step 4: Run the adapter tests**

Run: `npm test -- --runInBand src/search/pagefind.test.js`

Expected: 3 tests pass.

- [ ] **Step 5: Commit the adapter**

```bash
git add src/search/pagefind.js src/search/pagefind.test.js
git commit -m "feat: add lazy Pagefind search adapter"
```

### Task 3: Implement the accessible search interface with TDD

**Files:**
- Replace: `src/components/search.js`
- Create: `src/components/search.test.js`
- Create: `src/styles/search.module.sass`

- [ ] **Step 1: Write failing interaction tests**

Create `src/components/search.test.js`. Use a fake client with `search` and `retry` mocks. Cover these observable behaviors in separate tests:

```js
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Search from './search'

const result = {
    id: '/asr-data/annotations/#types',
    url: '/asr-data/annotations/#types',
    title: '时间轴与标注',
    section: 'Annotation 类型',
    excerpt: '常用的 <mark>标注</mark> 类型',
}

const makeClient = () => ({
    search: jest.fn().mockResolvedValue([result]),
    retry: jest.fn(),
})

test('opens from the trigger, focuses the input, and closes with Escape', async () => {
    const user = userEvent.setup()
    render(<Search client={makeClient()} />)
    await user.click(screen.getByRole('button', { name: '搜索文档' }))
    expect(screen.getByRole('dialog', { name: '搜索文档' })).toBeInTheDocument()
    expect(screen.getByRole('searchbox')).toHaveFocus()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '搜索文档' })).toHaveFocus()
})

test('opens with Control+K and renders search results', async () => {
    const user = userEvent.setup()
    const client = makeClient()
    render(<Search client={client} />)
    await user.keyboard('{Control>}k{/Control}')
    await user.type(screen.getByRole('searchbox'), '标注')
    expect(await screen.findByRole('option', { name: /时间轴与标注/ })).toHaveAttribute(
        'href',
        result.url
    )
    expect(client.search).toHaveBeenCalledWith('标注')
})

test('supports arrow selection and an empty result state', async () => {
    const user = userEvent.setup()
    const client = makeClient()
    client.search.mockResolvedValue([])
    render(<Search client={client} />)
    await user.click(screen.getByRole('button', { name: '搜索文档' }))
    await user.type(screen.getByRole('searchbox'), '不存在')
    expect(await screen.findByText('未找到相关文档')).toBeInTheDocument()
})

test('shows idle and loading states', async () => {
    const client = makeClient()
    client.search.mockReturnValue(new Promise(() => {}))
    render(<Search client={client} />)
    fireEvent.click(screen.getByRole('button', { name: '搜索文档' }))
    expect(screen.getByText('输入关键词搜索文档')).toBeInTheDocument()
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: '时间轴' } })
    expect(await screen.findByText('正在搜索…')).toBeInTheDocument()
})

test('moves selection with arrow keys and opens it with Enter', async () => {
    const user = userEvent.setup()
    const client = makeClient()
    client.search.mockResolvedValue([
        result,
        { ...result, id: '/asr-data/database', url: '/asr-data/database', title: 'SQLite 数据库' },
    ])
    const click = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    render(<Search client={client} />)
    await user.click(screen.getByRole('button', { name: '搜索文档' }))
    await user.type(screen.getByRole('searchbox'), '数据')
    const options = await screen.findAllByRole('option')
    await user.keyboard('{ArrowDown}{Enter}')
    expect(options[1]).toHaveAttribute('aria-selected', 'true')
    expect(click).toHaveBeenCalled()
    click.mockRestore()
})

test('shows a recoverable index error', async () => {
    const user = userEvent.setup()
    const client = makeClient()
    client.search.mockRejectedValueOnce(new Error('missing index')).mockResolvedValueOnce([result])
    render(<Search client={client} />)
    await user.click(screen.getByRole('button', { name: '搜索文档' }))
    await user.type(screen.getByRole('searchbox'), '标注')
    expect(await screen.findByText(/搜索索引暂时不可用/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '重新加载' }))
    expect(client.retry).toHaveBeenCalled()
    expect(await screen.findByRole('option', { name: /时间轴与标注/ })).toBeInTheDocument()
})

test('keeps the newest asynchronous query result', async () => {
    let resolveFirst
    let resolveSecond
    const first = new Promise((resolve) => { resolveFirst = resolve })
    const second = new Promise((resolve) => { resolveSecond = resolve })
    const client = makeClient()
    client.search.mockImplementation((query) => (query === 'first' ? first : second))
    render(<Search client={client} />)
    fireEvent.click(screen.getByRole('button', { name: '搜索文档' }))
    const input = screen.getByRole('searchbox')
    fireEvent.change(input, { target: { value: 'first' } })
    await waitFor(() => expect(client.search).toHaveBeenCalledWith('first'))
    fireEvent.change(input, { target: { value: 'second' } })
    await act(async () => resolveSecond([{ ...result, id: '/second', title: 'Second' }]))
    expect(await screen.findByText('Second')).toBeInTheDocument()
    await act(async () => resolveFirst([{ ...result, id: '/first', title: 'First' }]))
    expect(screen.queryByText('First')).not.toBeInTheDocument()
})
```

- [ ] **Step 2: Run the component tests and verify failure**

Run: `npm test -- --runInBand src/components/search.test.js`

Expected: FAIL because the existing Algolia component has no local-client interface or modal behavior.

- [ ] **Step 3: Replace `src/components/search.js` with the local UI**

Implement one component with these explicit state fields:

```js
const [isOpen, setIsOpen] = useState(false)
const [query, setQuery] = useState('')
const [results, setResults] = useState([])
const [status, setStatus] = useState('idle')
const [selectedIndex, setSelectedIndex] = useState(0)
const [retryVersion, setRetryVersion] = useState(0)
const requestId = useRef(0)
const triggerRef = useRef(null)
const inputRef = useRef(null)
```

Use one effect for `Command/Ctrl+K`, one effect to focus the input after opening, and one effect for queries. The query effect must increment `requestId.current`, set `idle` for blank input, set `loading` before calling `client.search(query)`, and apply success or failure only when its captured ID remains current.

Render this semantic structure:

```jsx
<>
    <button ref={triggerRef} type="button" aria-label="搜索文档" onClick={openSearch}>
        <Icon name="search" aria-hidden="true" />
        <span>搜索文档</span>
        <kbd>{isMac ? '⌘ K' : 'Ctrl K'}</kbd>
    </button>
    {isOpen && (
        <div className={classes.backdrop} onMouseDown={closeFromBackdrop}>
            <section role="dialog" aria-modal="true" aria-label="搜索文档">
                <input ref={inputRef} role="searchbox" value={query} onChange={onQueryChange} />
                <div role="listbox" aria-label="搜索结果">
                    {results.map((result, index) => (
                        <a
                            role="option"
                            aria-selected={selectedIndex === index}
                            href={result.url}
                            key={result.id}
                        >
                            <strong>{result.title}</strong>
                            {result.section && <span>{result.section}</span>}
                            <span dangerouslySetInnerHTML={{ __html: result.excerpt }} />
                        </a>
                    ))}
                </div>
            </section>
        </div>
    )}
</>
```

Handle ArrowDown, ArrowUp, Enter, and Escape on the dialog. Enter calls `.click()` on the selected result anchor. The retry button calls `client.retry()` and increments `retryVersion`. The failure copy is `搜索索引暂时不可用。开发环境请运行 npm run preview:search。` Set `Search.defaultProps = { client: pagefindClient }` and define PropTypes for the injected client.

- [ ] **Step 4: Add the selected visual design in `src/styles/search.module.sass`**

Use existing CSS variables for colors, spacing, shadow, and fonts. Define focused classes for `trigger`, `trigger-label`, `shortcut`, `backdrop`, `dialog`, `input`, `results`, `result`, `is-selected`, `result-path`, `excerpt`, `state`, and `footer`. The backdrop must be fixed on all four edges with `z-index: 50`; the dialog must be at most `640px` wide and fit within `calc(100vw - 2rem)`. At the `max, xs` breakpoint, hide `trigger-label` and `shortcut` and render a 4rem square trigger.

- [ ] **Step 5: Run the component tests**

Run: `npm test -- --runInBand src/components/search.test.js`

Expected: all search component tests pass without act warnings.

- [ ] **Step 6: Commit the interface**

```bash
git add src/components/search.js src/components/search.test.js src/styles/search.module.sass
git commit -m "feat: add local document search modal"
```

### Task 4: Integrate search and define index boundaries with TDD

**Files:**
- Create: `src/components/searchIndexing.test.js`
- Modify: `src/templates/index.js`
- Modify: `src/templates/docs.js`
- Modify: `src/components/main.js`
- Modify: `src/components/codeBlock.js`
- Modify: `src/components/title.js`
- Modify: `src/components/typography.js`
- Modify: `src/styles/navigation.module.sass`

- [ ] **Step 1: Write failing indexing-boundary tests**

Create `src/components/searchIndexing.test.js`:

```js
import { render } from '@testing-library/react'
import Main from './main'
import { Pre } from './codeBlock'
import Title from './title'

test('marks wrapped article content as the Pagefind body', () => {
    const { container } = render(<Main wrapContent>searchable prose</Main>)
    expect(container.querySelector('article')).toHaveAttribute('data-pagefind-body')
})

test('excludes fenced code blocks from the Pagefind index', () => {
    const { container } = render(<Pre>secret_code_only_token</Pre>)
    expect(container.querySelector('pre')).toHaveAttribute('data-pagefind-ignore')
})

test('exposes a concise document title to Pagefind', () => {
    const { container } = render(<Title title="时间轴与标注" />)
    expect(container.querySelector('h1')).toHaveAttribute('data-pagefind-meta', 'title')
})
```

- [ ] **Step 2: Run the boundary tests and verify failure**

Run: `npm test -- --runInBand src/components/searchIndexing.test.js`

Expected: both tests fail because the attributes are absent.

- [ ] **Step 3: Add the Pagefind attributes**

Change the wrapped-content branch in `src/components/main.js` to:

```jsx
{wrapContent ? (
    <Content Component="article" data-pagefind-body="">
        {children}
    </Content>
) : (
    children
)}
```

Update `Content` to forward remaining DOM props:

```jsx
export const Content = ({ Component = 'div', className, children, ...props }) => (
    <Component className={classNames(classes.content, className)} {...props}>
        {children}
    </Component>
)
```

Change `Pre` in `src/components/codeBlock.js` to:

```jsx
export const Pre = (props) => (
    <pre className={classes.pre} data-pagefind-ignore="">
        {props.children}
    </pre>
)
```

Wrap `subFooter` in `src/templates/docs.js` with `<div data-pagefind-ignore="">` so suggestion controls and “Read next” text are outside the index.

Add `data-pagefind-meta="title"` to the `H1` rendered by `src/components/title.js`. Add `...props` to the `Headline` parameter list in `src/components/typography.js` and spread those props onto its rendered heading so the metadata attribute reaches the final HTML.

- [ ] **Step 4: Mount the search trigger**

Import `Search` in `src/templates/index.js` and change the `Navigation` children to:

```jsx
<>
    <Search />
    <Progress />
</>
```

Update `src/styles/navigation.module.sass` so `.menu` retains `margin-left: auto`, the search trigger sits after it with right margin, and the existing progress bar remains absolutely positioned and unaffected.

- [ ] **Step 5: Run focused and full tests**

Run:

```bash
npm test -- --runInBand src/components/searchIndexing.test.js
npm test -- --runInBand
```

Expected: all tests pass.

- [ ] **Step 6: Commit integration**

```bash
git add src/templates/index.js src/templates/docs.js src/components/main.js src/components/codeBlock.js src/components/title.js src/components/typography.js src/components/searchIndexing.test.js src/styles/navigation.module.sass
git commit -m "feat: integrate search with documentation pages"
```

### Task 5: Generate the static Pagefind index and remove Algolia configuration

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `next.config.mjs`
- Modify: `src/styles/layout.sass`
- Modify: `src/styles/navigation.module.sass`
- Delete: `src/styles/search.sass`

- [ ] **Step 1: Add index scripts after static export**

Set these scripts in `package.json`:

```json
"build": "npm run site:export && npm run search:index",
"site:export": "next build && npm run sitemap && next export",
"search:index": "pagefind --site out",
"preview:search": "npm run build && pagefind --site out --serve"
```

- [ ] **Step 2: Remove obsolete Algolia configuration**

Uninstall `@docsearch/react` after replacing the production search component: `npm uninstall @docsearch/react`. Remove the `env.DOCSEARCH_API_KEY` block from `next.config.mjs`. Remove the `/* Algolia DocSearch */` section and all `.DocSearch-*` or `.algolia-*` selectors from `src/styles/layout.sass`. Remove the three `--docsearch-*` custom properties and the unused `.search` rule from `src/styles/navigation.module.sass`. Delete `src/styles/search.sass` after confirming nothing imports it.

- [ ] **Step 3: Run tests and build the real index**

Run:

```bash
npm test -- --runInBand
npm run build
```

Expected: tests pass; Next export succeeds; Pagefind reports 6 indexed documentation pages and creates `out/pagefind/pagefind.js` plus index chunk files. Because at least one page contains `data-pagefind-body`, Pagefind excludes the homepage and 404 page, which do not contain that attribute.

- [ ] **Step 4: Verify the generated HTML boundaries**

Run:

```bash
rg -n "data-pagefind-body|data-pagefind-ignore" out/asr-data/index.html
find out/pagefind -type f | sort | sed -n '1,30p'
```

Expected: the article has `data-pagefind-body`, code blocks have `data-pagefind-ignore`, and the generated bundle contains JavaScript, WASM, metadata, and index fragments.

- [ ] **Step 5: Commit the production index pipeline**

```bash
git add package.json package-lock.json next.config.mjs src/styles/layout.sass src/styles/navigation.module.sass src/styles/search.sass
git commit -m "build: generate local Pagefind index"
```

### Task 6: Document and verify the finished search experience

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Document local indexed preview**

Add this section to `README.md`:

````markdown
## Search preview

The regular development server does not generate a search index. To build the
static site, generate its Pagefind index, and start an indexed preview, run:

```bash
npm run preview:search
```

Production builds run Pagefind automatically after Next.js exports the site.
````

- [ ] **Step 2: Run automated verification**

Run:

```bash
npm run lint
npm test -- --runInBand
npm run build
git diff --check
```

Expected: all commands exit 0. The existing `src/components/embed.js` `<img>` lint warning may remain; no new warnings are introduced.

- [ ] **Step 3: Run an indexed preview and inspect it in the browser**

Run `npm run preview:search`, open the reported local URL, and verify:

1. Desktop navigation shows the full `搜索文档` trigger and shortcut.
2. Mobile width shows the icon trigger with the accessible label intact.
3. `Command+K` or `Ctrl+K` opens the modal and focuses the input.
4. `时间轴` and `SQLite` return relevant results.
5. Arrow keys and Enter navigate to the selected page or heading.
6. Escape closes the modal and restores focus.
7. A unique token present only inside a fenced code block returns no results.

- [ ] **Step 4: Commit the documentation**

```bash
git add README.md
git commit -m "docs: explain local search preview"
```

- [ ] **Step 5: Review branch scope**

Run:

```bash
git status --short
git log --oneline main..HEAD
git diff --stat main...HEAD
```

Expected: the worktree is clean, commits are limited to local search, and no generated `out/`, `.next/`, or `public/sw.js` files are staged.
