# Documentation Template Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将现有项目文档站改造成只包含中文使用手册的配置驱动文档站模板。

**Architecture:** 保留现有 Next.js、MDX、静态导出和 Pagefind 实现，以
`meta/site.json` 作为站点身份与全局导航配置，以 `meta/sidebars.json` 作为手册
信息架构配置。唯一的公开文档分区为 `/guide`；自动化测试锁定模板的配置、文件集合
和旧品牌清理要求。

**Tech Stack:** Next.js 13、React 18、TypeScript、MDX、Jest、Pagefind、Sass

---

### Task 1: 更新实施基线并建立模板约束测试

**Files:**
- Create: `test/templateContent.test.js`
- Reference: `docs/superpowers/specs/2026-07-25-documentation-template-design.md`

- [ ] **Step 1: 将本地提交放到已获取的上游快照之上**

由于 2026-07-25 刷新 GitHub 两次均遇到网络错误，先使用本地已存在的
`origin/main` 快照 `57f5e01`：

```bash
git rebase origin/main
```

Expected: rebase 成功；设计提交位于 `57f5e01` 之后，`git status --short --branch`
显示本地仅领先 `origin/main`，不再落后。

- [ ] **Step 2: 编写会失败的模板内容测试**

创建 `test/templateContent.test.js`：

```js
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
            expect(read(file)).toMatch(/^---[\\s\\S]*?section: guide[\\s\\S]*?---/)
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
```

- [ ] **Step 3: 运行测试并确认失败原因正确**

Run:

```bash
npm test -- --runInBand test/templateContent.test.js
```

Expected: FAIL，因为站点仍有两个旧分区，且 `docs/guide/` 尚未创建。

- [ ] **Step 4: 提交约束测试**

```bash
git add test/templateContent.test.js
git commit -m "test: define documentation template content"
```

### Task 2: 将站点身份和仓库说明改成通用配置

**Files:**
- Modify: `meta/site.json`
- Modify: `meta/sidebars.json`
- Modify: `meta/type-annotations.json`
- Modify: `public/manifest.webmanifest`
- Modify: `package.json`
- Modify: `AGENTS.md`
- Modify: `README.md`

- [ ] **Step 1: 替换站点元数据**

将 `meta/site.json` 改为：

```json
{
    "title": "Documentation Template",
    "description": "一个支持 MDX、静态导出和本地搜索的中文文档站模板。",
    "slogan": "Build clear documentation with MDX",
    "domain": "example.com",
    "company": "Your Organization",
    "companyUrl": "https://github.com/your-org",
    "repo": "your-org/documentation-template",
    "theme": "#09a3d5",
    "sections": [
        { "id": "guide", "title": "模板使用手册", "theme": "blue" }
    ],
    "navigation": [
        { "text": "使用手册", "url": "/guide" }
    ],
    "footer": [
        {
            "label": "文档",
            "items": [
                { "text": "模板概览", "url": "/guide" },
                { "text": "快速开始", "url": "/guide/getting-started" }
            ]
        },
        {
            "label": "链接",
            "items": [
                {
                    "text": "模板仓库",
                    "url": "https://github.com/your-org/documentation-template"
                }
            ]
        }
    ]
}
```

- [ ] **Step 2: 替换侧边栏并清空项目类型链接**

将 `meta/sidebars.json` 改成 Task 1 测试中的单一 `guide` 结构。将
`meta/type-annotations.json` 改成空对象：

```json
{}
```

- [ ] **Step 3: 更新包名和 PWA 身份**

将 `package.json` 的 `name` 改成 `documentation-site-template`，并将
`public/manifest.webmanifest` 的 `name` 和 `short_name` 分别改成
`Documentation Template` 与 `Docs Template`。同步更新
`package-lock.json` 顶层及根 package 的名称。

- [ ] **Step 4: 改写仓库协作说明**

将 `AGENTS.md` 改成通用模板仓库说明，明确：

```markdown
# Documentation Template

基于 Next.js、MDX 和 Pagefind 的中文静态文档站模板。

## 内容约定

- 文档放在 `docs/`，每个分区使用独立目录。
- 全局站点信息配置在 `meta/site.json`。
- 页面分组与顺序配置在 `meta/sidebars.json`。
- 文档应从快速开始逐步进入概念、功能和参考内容。
- 示例应放在相关说明之后，并保持完整、简短和可执行。
- 修改导航或文档后必须运行测试和生产构建。
```

- [ ] **Step 5: 改写 README**

README 只承担仓库级快速入口，包含：

````markdown
# Documentation Site Template

一个基于 Next.js、MDX 和 Pagefind 的中文静态文档站模板。

## 开始使用

```bash
npm install
npm run dev
```

打开 `http://localhost:3000`。站点信息位于 `meta/site.json`，侧边栏位于
`meta/sidebars.json`，文档位于 `docs/`。

## 验证搜索

```bash
npm run preview:search
```

普通开发服务器不会生成 Pagefind 索引。完整用法请查看站内的
[模板使用手册](/guide)。

## 致谢

本站模板基于 [spaCy website](https://spacy.io/) 的开源站点架构。
````

注意 Markdown 中两个命令代码块应正确闭合。

- [ ] **Step 6: 运行测试并确认只剩文档集合相关失败**

Run:

```bash
npm test -- --runInBand test/templateContent.test.js
```

Expected: 元数据和旧品牌断言已有进展；测试仍因 `docs/guide/` 未创建、旧文档目录
仍存在而失败。

- [ ] **Step 7: 提交通用配置**

```bash
git add AGENTS.md README.md package.json package-lock.json public/manifest.webmanifest meta/site.json meta/sidebars.json meta/type-annotations.json
git commit -m "refactor: make site metadata reusable"
```

### Task 3: 建立中文模板使用手册

**Files:**
- Create: `docs/guide/index.mdx`
- Create: `docs/guide/getting-started.mdx`
- Create: `docs/guide/site-configuration.mdx`
- Create: `docs/guide/organizing-docs.mdx`
- Create: `docs/guide/mdx-components.mdx`
- Create: `docs/guide/search.mdx`
- Create: `docs/guide/build-and-deploy.mdx`

- [ ] **Step 1: 创建概览和快速开始**

`docs/guide/index.mdx` 使用以下 frontmatter：

```yaml
---
title: 模板概览
teaser: 使用可配置的 Next.js、MDX 和 Pagefind 搭建中文文档站
section: guide
menu:
  - ['模板能力', 'features']
  - ['目录结构', 'structure']
  - ['下一步', 'next']
---
```

正文说明模板提供静态导出、MDX、响应式导航、Pagefind 本地搜索和 PWA；用目录树
解释 `docs/`、`meta/`、`pages/`、`src/`、`public/`；最后链接到
`/guide/getting-started`。

`docs/guide/getting-started.mdx` 使用以下 frontmatter：

```yaml
---
title: 快速开始
teaser: 安装依赖并启动你的第一个文档站
section: guide
menu:
  - ['环境要求', 'requirements']
  - ['创建站点', 'create']
  - ['开始修改', 'customize']
---
```

正文给出 Node.js 24、复制仓库、`npm install`、`npm run dev`、
`http://localhost:3000`，并将首次修改顺序限定为 `meta/site.json`、
`meta/sidebars.json`、`docs/` 和 `pages/index.tsx`。

- [ ] **Step 2: 创建配置与文档组织说明**

`docs/guide/site-configuration.mdx` 逐字段解释 `meta/site.json`，给出一个完整 JSON
示例，并说明 `domain` 是裸域名、`repo` 使用 `owner/repo`、主题色同时同步到
`public/manifest.webmanifest` 和 `pages/_app.tsx`。

`docs/guide/organizing-docs.mdx` 说明：

- `docs/<section>/index.mdx` 映射到 `/<section>`。
- `docs/<section>/<page>.mdx` 映射到 `/<section>/<page>`。
- frontmatter 的 `title`、`teaser`、`section`、`menu` 含义。
- `meta/sidebars.json` 同时控制左侧导航和“下一篇”顺序。
- 新分区必须同时加入 `meta/site.json.sections` 和 `meta/sidebars.json`。

两个页面都提供完整、可复制的 JSON 或 MDX 示例。

- [ ] **Step 3: 创建 MDX 组件说明**

`docs/guide/mdx-components.mdx` 展示并解释模板已经注册的常用组件：

```mdx
<Infobox title="提示">

这里放补充说明。

</Infobox>

<Infobox title="注意" variant="warning">

这里放需要注意的内容。

</Infobox>

<Button to="/guide/getting-started" variant="primary">
    开始使用
</Button>

<Accordion title="展开查看" id="accordion-example">

这里放可折叠内容。

</Accordion>

<Grid cols={2}>
    <Button to="/guide">模板概览</Button>
    <Button to="/guide/search">本地搜索</Button>
</Grid>
```

同时说明普通 Markdown 表格、引用块、图片和代码块会被现有 MDX 映射自动渲染。

- [ ] **Step 4: 创建搜索与部署说明**

`docs/guide/search.mdx` 说明：

- `npm run dev` 不生成索引。
- `npm run preview:search` 依次构建、索引并启动预览。
- `npm run search:index` 针对现有 `out/` 重建索引。
- Pagefind 检索标题、章节和正文，排除代码块、导航、页脚和文档示例侧栏。
- 自定义页面可使用 `data-pagefind-body` 与 `data-pagefind-ignore` 控制范围。

`docs/guide/build-and-deploy.mdx` 说明 `npm run test`、`npm run lint`、
`npm run build`，解释 `out/` 是部署目录，并分别给出 Vercel
（使用仓库内 `vercel.json`）和普通静态托管的部署约束。说明设置 `SITE_URL` 可生成
正确 sitemap 域名。

- [ ] **Step 5: 检查所有页面 frontmatter 和链接**

Run:

```bash
rg -n "^title:|^section:|/guide" docs/guide
```

Expected: 7 个页面都有 `section: guide`，所有内部链接都指向已定义的 `/guide`
路由。

- [ ] **Step 6: 提交模板手册**

```bash
git add docs/guide
git commit -m "docs: add Chinese template guide"
```

### Task 4: 删除旧内容并改写首页

**Files:**
- Delete: `docs/asr-data/`
- Delete: `docs/vad-burn/`
- Delete: `public/asr-data/`
- Modify: `pages/index.tsx`

- [ ] **Step 1: 删除旧项目文档和资源**

删除三个项目专属目录，只保留 `docs/guide/`、`docs/superpowers/` 和通用 public
资源。删除前用 `git status --short` 确认目标路径，避免涉及其他目录。

- [ ] **Step 2: 将首页改为单一模板入口**

保持现有 Landing 组件和布局，将 `pages/index.tsx` 的内容改为：

```tsx
import React from 'react'

import Layout from '../src/templates'
import {
    LandingHeader,
    LandingTitle,
    LandingSubtitle,
    LandingGrid,
    LandingCard,
} from '../src/components/landing'

export default function Home() {
    return (
        <Layout>
            <LandingHeader>
                <LandingTitle>中文文档站模板</LandingTitle>
                <LandingSubtitle>
                    使用 Next.js、MDX 和 Pagefind 构建清晰、可搜索的静态文档
                </LandingSubtitle>
            </LandingHeader>
            <LandingGrid blocks>
                <LandingCard title="模板使用手册" url="/guide" button="开始使用">
                    从站点配置、文档组织和 MDX 组件，到本地搜索、构建与部署。
                </LandingCard>
            </LandingGrid>
        </Layout>
    )
}
```

- [ ] **Step 3: 运行模板约束测试并确认通过**

Run:

```bash
npm test -- --runInBand test/templateContent.test.js
```

Expected: PASS，4 个测试全部通过。

- [ ] **Step 4: 扫描公开模板残留**

Run:

```bash
rg -n -i "di-osc|asr-data|vad-burn" README.md AGENTS.md package.json package-lock.json public meta pages src docs/guide
```

Expected: 无匹配。`LICENSE` 和 `docs/superpowers/` 是归属与迁移记录，不纳入公开
模板残留扫描。

- [ ] **Step 5: 提交内容切换**

```bash
git add docs/asr-data docs/vad-burn public/asr-data pages/index.tsx
git commit -m "refactor: replace project docs with template guide"
```

### Task 5: 完整验证模板

**Files:**
- Modify only if verification exposes a defect.

- [ ] **Step 1: 运行全部单元测试**

Run:

```bash
npm test -- --runInBand
```

Expected: 全部测试通过，无失败测试。

- [ ] **Step 2: 运行代码检查**

Run:

```bash
npm run lint
```

Expected: exit 0；若仍出现既有 `<img>` 提示，记录为非阻塞 warning，不扩展到无关
重构。

- [ ] **Step 3: 执行生产构建与 Pagefind 索引**

Run:

```bash
npm run build
```

Expected: Next.js 静态导出成功；生成 `/guide` 的 7 个页面与 `out/pagefind/` 索引。

- [ ] **Step 4: 检查静态产物和搜索数据**

Run:

```bash
test -f out/guide.html
test -f out/guide/getting-started.html
test -d out/pagefind
rg -n "模板使用手册|快速开始" out/guide.html out/guide/getting-started.html
```

Expected: 所有命令 exit 0，静态页面包含对应中文标题。

- [ ] **Step 5: 检查最终变更范围**

Run:

```bash
git status --short
git diff --check origin/main...HEAD
git log --oneline --decorate origin/main..HEAD
```

Expected: 工作区干净；diff 无空白错误；提交仅包含设计、计划、模板测试、配置、手册、
旧内容清理和首页改写。
