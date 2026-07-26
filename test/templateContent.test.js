const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8')
const readJson = (relativePath) => JSON.parse(read(relativePath))

const documentationPages = fs
    .readdirSync(path.join(root, 'docs'), { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name !== 'superpowers')
    .flatMap((entry) =>
        fs
            .readdirSync(path.join(root, 'docs', entry.name))
            .filter((file) => file.endsWith('.mdx'))
            .map((file) => `docs/${entry.name}/${file}`)
    )
    .sort()

const routeForDocument = (file) => {
    const [, section, filename] = file.match(/^docs\/([^/]+)\/([^/]+)\.mdx$/)
    return filename === 'index' ? `/${section}` : `/${section}/${filename}`
}

const frontmatterForDocument = (file) => {
    const match = read(file).match(/^---\n([\s\S]*?)\n---/)
    if (!match) {
        return null
    }

    return Object.fromEntries(
        ['title', 'teaser', 'section'].map((field) => [
            field,
            match[1].match(new RegExp(`^${field}:\\s*(.+)$`, 'm'))?.[1],
        ])
    )
}

const sidebarLinks = (sidebars) =>
    sidebars.flatMap((sidebar) =>
        sidebar.items.flatMap((group) =>
            group.items.map((item) => ({ ...item, section: sidebar.section }))
        )
    )

const sectionByAnchor = (content, anchor) =>
    content.match(
        new RegExp(`^## .+ \\{id="${anchor}"\\}\\n([\\s\\S]*?)(?=^## |(?![\\s\\S]))`, 'm')
    )?.[1] ?? ''

describe('documentation template content', () => {
    test('keeps site sections, top navigation, and sidebars connected', () => {
        const site = readJson('meta/site.json')
        const sidebars = readJson('meta/sidebars.json')
        const sectionIds = site.sections.map((section) => section.id)

        expect(new Set(sectionIds).size).toBe(sectionIds.length)
        expect(sidebars.map((sidebar) => sidebar.section).sort()).toEqual([...sectionIds].sort())
        for (const item of site.navigation.filter((item) => item.url.startsWith('/'))) {
            expect(sectionIds).toContain(item.url.split('/')[1])
        }
    })

    test('all documentation pages have complete frontmatter and a sidebar entry', () => {
        const sidebars = readJson('meta/sidebars.json')
        const links = sidebarLinks(sidebars)

        for (const file of documentationPages) {
            const section = file.split('/')[1]
            const frontmatter = frontmatterForDocument(file)
            const route = routeForDocument(file)

            expect(frontmatter).not.toBeNull()
            expect(frontmatter?.title).toBeTruthy()
            expect(frontmatter?.teaser).toBeTruthy()
            expect(frontmatter?.section).toBe(section)
            expect(links).toContainEqual(expect.objectContaining({ section, url: route }))
        }
    })

    test('all sidebar links resolve to documents in the same section', () => {
        const links = sidebarLinks(readJson('meta/sidebars.json'))
        const routes = new Set(documentationPages.map(routeForDocument))

        for (const link of links) {
            expect(link.url.split('/')[1]).toBe(link.section)
            expect(routes).toContain(link.url)
        }
    })

    test('right-side menu entries point to explicit heading anchors', () => {
        for (const file of documentationPages) {
            const content = read(file)
            const frontmatter = content.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? ''
            const menuIds = [...frontmatter.matchAll(/\['[^']+',\s*'([^']+)'\]/g)].map(
                (match) => match[1]
            )

            for (const id of menuIds) {
                expect(content).toContain(`{id="${id}"}`)
            }
        }
    })

    test('bundled component examples pair source code with a live result', () => {
        const guidePath = 'docs/writing/mdx-components.mdx'
        if (!fs.existsSync(path.join(root, guidePath))) return

        const guide = read(guidePath)
        const examples = [
            ['infobox', '<Infobox'],
            ['button', '<Button'],
            ['accordion', '<Accordion'],
            ['grid', '<Grid'],
            ['aside', '<Aside'],
            ['tag', '<Tag'],
            ['type-annotations', '~~AcmeClient~~'],
        ]

        for (const [anchor, sourceToken] of examples) {
            const section = sectionByAnchor(guide, anchor)
            expect(section).toContain('实际效果')
            expect(section.split(sourceToken).length).toBeGreaterThanOrEqual(3)
        }
    })

    test('bundled asset examples only render files that exist in public', () => {
        const guidePath = 'docs/writing/assets.mdx'
        if (!fs.existsSync(path.join(root, guidePath))) return

        const guideWithoutCode = read(guidePath).replace(/```[\s\S]*?```/g, '')
        const imagePaths = [...guideWithoutCode.matchAll(/!\[[^\]]*]\((\/[^)]+)\)/g)].map(
            (match) => match[1]
        )

        expect(imagePaths.length).toBeGreaterThan(0)
        for (const imagePath of imagePaths) {
            expect(fs.existsSync(path.join(root, 'public', imagePath.replace(/^\//, '')))).toBe(
                true
            )
        }
    })

    test('prefixes root public metadata with the configured deployment path', () => {
        const app = read('pages/_app.tsx')

        expect(app).toContain("withBasePath('/sitemap.xml')")
        expect(app).toContain("withBasePath('/manifest.webmanifest')")
        expect(app).toContain('content={site.theme}')
        expect(read('src/components/embed.js')).toContain('withBasePathForUrl(src)')
    })

    test('configures static builds and the web manifest for subpath hosting', () => {
        const nextConfig = read('next.config.mjs')
        const manifest = readJson('public/manifest.webmanifest')

        expect(nextConfig).toContain(
            'basePath: normalizeBasePath(process.env.NEXT_PUBLIC_BASE_PATH)'
        )
        expect(manifest.scope).toBe('.')
        expect(manifest.start_url).toBe('.')
    })

    test('ships a GitHub Pages workflow with build metadata and deployment permissions', () => {
        const workflow = read('.github/workflows/deploy-pages.yml')

        expect(workflow).toContain('branches: [main]')
        expect(workflow).toContain('workflow_dispatch:')
        expect(workflow).toContain('pages: write')
        expect(workflow).toContain('id-token: write')
        expect(workflow).toContain('uses: actions/configure-pages@v5')
        expect(workflow).toContain('NEXT_PUBLIC_BASE_PATH: ${{ steps.pages.outputs.base_path }}')
        expect(workflow).toContain('SITE_URL: ${{ steps.pages.outputs.base_url }}')
        expect(workflow).toContain('uses: actions/upload-pages-artifact@v4')
        expect(workflow).toContain('path: ./out')
        expect(workflow).toContain('needs: build')
        expect(workflow).toContain('name: github-pages')
        expect(workflow).toContain('uses: actions/deploy-pages@v4')
    })
})
