const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8')
const readJson = (relativePath) => JSON.parse(read(relativePath))

const documentationPages = [
    'docs/getting-started/index.mdx',
    'docs/getting-started/quickstart.mdx',
    'docs/getting-started/site-configuration.mdx',
    'docs/writing/index.mdx',
    'docs/writing/mdx-components.mdx',
    'docs/publishing/index.mdx',
    'docs/publishing/build-and-deploy.mdx',
]

describe('documentation template content', () => {
    test('exposes three top-level sections with independent page navigation', () => {
        const site = readJson('meta/site.json')
        const sidebars = readJson('meta/sidebars.json')

        expect(site.sections).toEqual([
            { id: 'getting-started', title: '入门', theme: 'blue' },
            { id: 'writing', title: '编写', theme: 'blue' },
            { id: 'publishing', title: '发布', theme: 'blue' },
        ])
        expect(sidebars).toEqual([
            {
                section: 'getting-started',
                items: [
                    {
                        label: '入门',
                        items: [
                            { text: '模板概览', url: '/getting-started' },
                            { text: '快速开始', url: '/getting-started/quickstart' },
                            {
                                text: '站点配置',
                                url: '/getting-started/site-configuration',
                            },
                        ],
                    },
                ],
            },
            {
                section: 'writing',
                items: [
                    {
                        label: '编写文档',
                        items: [
                            { text: '添加与组织文档', url: '/writing' },
                            { text: 'MDX 组件', url: '/writing/mdx-components' },
                        ],
                    },
                ],
            },
            {
                section: 'publishing',
                items: [
                    {
                        label: '发布站点',
                        items: [
                            { text: '本地搜索', url: '/publishing' },
                            {
                                text: '构建与部署',
                                url: '/publishing/build-and-deploy',
                            },
                        ],
                    },
                ],
            },
        ])
    })

    test('contains only the documentation template sections', () => {
        expect(
            fs
                .readdirSync(path.join(root, 'docs'), { withFileTypes: true })
                .filter((entry) => entry.isDirectory() && entry.name !== 'superpowers')
                .map((entry) => entry.name)
                .sort()
        ).toEqual(['getting-started', 'publishing', 'writing'])
        expect(documentationPages.every((file) => fs.existsSync(path.join(root, file)))).toBe(true)
    })

    test('all documentation pages declare the section from their directory', () => {
        for (const file of documentationPages) {
            const section = file.split('/')[1]
            const frontmatter = read(file).match(/^---\n([\s\S]*?)\n---/)
            expect(frontmatter?.[1]).toContain(`section: ${section}`)
        }
    })

    test('public template files contain no former project branding', () => {
        const publicTemplateFiles = [
            'README.md',
            'AGENTS.md',
            'package.json',
            'public/manifest.webmanifest',
            'meta/site.json',
            'meta/sidebars.json',
            'meta/type-annotations.json',
            'pages/index.tsx',
            ...documentationPages,
        ]
        const content = publicTemplateFiles.map(read).join('\n').toLowerCase()

        expect(content).not.toMatch(/di-osc|asr-data|vad-burn/)
        expect(content).not.toMatch(/\bguide\b/)
    })

    test('homepage highlights the three template capabilities', () => {
        const homepage = read('pages/index.tsx')

        expect(homepage).toContain('配置驱动')
        expect(homepage).toContain('MDX 与 Example')
        expect(homepage).toContain('本地搜索与静态部署')
        expect(homepage).toContain('url="/getting-started"')
        expect(homepage).toContain('url="/writing/mdx-components"')
        expect(homepage).toContain('url="/publishing"')
    })

    test('quickstart does not continue an ordered list across an Example', () => {
        const quickstart = read('docs/getting-started/quickstart.mdx')

        expect(quickstart).toContain('安装完成后，打开')
        expect(quickstart).not.toContain('3. 打开')
    })

    test('prefixes root public metadata with the configured deployment path', () => {
        const app = read('pages/_app.tsx')

        expect(app).toContain("withBasePath('/sitemap.xml')")
        expect(app).toContain("withBasePath('/manifest.webmanifest')")
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
        expect(workflow).toContain(
            'NEXT_PUBLIC_BASE_PATH: ${{ steps.pages.outputs.base_path }}'
        )
        expect(workflow).toContain('SITE_URL: ${{ steps.pages.outputs.base_url }}')
        expect(workflow).toContain('uses: actions/upload-pages-artifact@v4')
        expect(workflow).toContain('path: ./out')
        expect(workflow).toContain('needs: build')
        expect(workflow).toContain('name: github-pages')
        expect(workflow).toContain('uses: actions/deploy-pages@v4')
    })

    test('documents the bundled GitHub Pages deployment from setup to site URL', () => {
        const deploymentGuide = read('docs/publishing/build-and-deploy.mdx')

        expect(deploymentGuide).toContain(
            "['部署到 GitHub Pages', 'github-pages']"
        )
        expect(deploymentGuide).toContain('.github/workflows/deploy-pages.yml')
        expect(deploymentGuide).toContain('Settings → Pages')
        expect(deploymentGuide).toContain('Source')
        expect(deploymentGuide).toContain('GitHub Actions')
        expect(deploymentGuide).toContain('推送到 `main`')
        expect(deploymentGuide).toContain(
            'https://<用户名>.github.io/<仓库名>/'
        )
        expect(deploymentGuide).toContain(
            'https://<用户名>.github.io/'
        )
        expect(deploymentGuide).toContain('NEXT_PUBLIC_BASE_PATH')
        expect(deploymentGuide).toContain('SITE_URL')
        expect(deploymentGuide).toContain('无需手工填写仓库子路径')
    })
})
