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
})
