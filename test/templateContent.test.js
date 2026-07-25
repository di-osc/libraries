const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8')
const readJson = (relativePath) => JSON.parse(read(relativePath))

const guidePages = [
    'docs/guide/index.mdx',
    'docs/guide/getting-started.mdx',
    'docs/guide/site-configuration.mdx',
    'docs/guide/organizing-docs.mdx',
    'docs/guide/mdx-components.mdx',
    'docs/guide/search.mdx',
    'docs/guide/build-and-deploy.mdx',
]

describe('documentation template content', () => {
    test('exposes one guide section with the expected page order', () => {
        const site = readJson('meta/site.json')
        const sidebars = readJson('meta/sidebars.json')

        expect(site.sections).toEqual([
            { id: 'guide', title: '模板使用手册', theme: 'blue' },
        ])
        expect(sidebars).toEqual([
            {
                section: 'guide',
                items: [
                    {
                        label: '开始使用',
                        items: [
                            { text: '模板概览', url: '/guide' },
                            { text: '快速开始', url: '/guide/getting-started' },
                            { text: '站点配置', url: '/guide/site-configuration' },
                        ],
                    },
                    {
                        label: '编写与发布',
                        items: [
                            { text: '添加与组织文档', url: '/guide/organizing-docs' },
                            { text: 'MDX 组件', url: '/guide/mdx-components' },
                            { text: '本地搜索', url: '/guide/search' },
                            { text: '构建与部署', url: '/guide/build-and-deploy' },
                        ],
                    },
                ],
            },
        ])
    })

    test('contains only the guide documentation set', () => {
        expect(
            fs
                .readdirSync(path.join(root, 'docs'), { withFileTypes: true })
                .filter((entry) => entry.isDirectory() && entry.name !== 'superpowers')
                .map((entry) => entry.name)
        ).toEqual(['guide'])
        expect(guidePages.every((file) => fs.existsSync(path.join(root, file)))).toBe(true)
    })

    test('all guide pages declare the guide section', () => {
        for (const file of guidePages) {
            expect(read(file)).toMatch(/^---[\s\S]*?section: guide[\s\S]*?---/)
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
            ...guidePages,
        ]
        const content = publicTemplateFiles.map(read).join('\n').toLowerCase()

        expect(content).not.toMatch(/di-osc|asr-data|vad-burn/)
    })
})
