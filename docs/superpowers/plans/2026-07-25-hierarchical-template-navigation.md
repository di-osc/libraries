# Hierarchical Template Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将中文模板手册改成 spaCy 风格的三个顶部大章节、左侧小页面和正文右侧 Example 布局。

**Architecture:** `meta/site.json` 定义“入门 / 编写 / 发布”三个顶部大章节，
`meta/sidebars.json` 为每章定义独立左侧页面。七篇现有手册内容迁移到三个目录；
第一篇使用各章 `index.mdx`，保证顶部链接直接可访问。`Aside` 作为正式 MDX 组件
注册，手册用它展示与正文小节对齐的 Example。

**Tech Stack:** Next.js 13、React 18、MDX、Jest、Testing Library、Pagefind、Sass

---

### Task 1: 用失败测试定义新信息架构与 Aside API

**Files:**
- Modify: `test/templateContent.test.js`
- Create: `src/components/aside.test.js`

- [ ] **Step 1: 更新模板文件与导航期望**

将 `guidePages` 替换为：

```js
const documentationPages = [
    'docs/getting-started/index.mdx',
    'docs/getting-started/quickstart.mdx',
    'docs/getting-started/site-configuration.mdx',
    'docs/writing/index.mdx',
    'docs/writing/mdx-components.mdx',
    'docs/publishing/index.mdx',
    'docs/publishing/build-and-deploy.mdx',
]
```

将站点 sections 期望改为：

```js
expect(site.sections).toEqual([
    { id: 'getting-started', title: '入门', theme: 'blue' },
    { id: 'writing', title: '编写', theme: 'blue' },
    { id: 'publishing', title: '发布', theme: 'blue' },
])
```

将 sidebars 期望改为三个对象：

```js
expect(sidebars).toEqual([
    {
        section: 'getting-started',
        items: [{
            label: '入门',
            items: [
                { text: '模板概览', url: '/getting-started' },
                { text: '快速开始', url: '/getting-started/quickstart' },
                { text: '站点配置', url: '/getting-started/site-configuration' },
            ],
        }],
    },
    {
        section: 'writing',
        items: [{
            label: '编写文档',
            items: [
                { text: '添加与组织文档', url: '/writing' },
                { text: 'MDX 组件', url: '/writing/mdx-components' },
            ],
        }],
    },
    {
        section: 'publishing',
        items: [{
            label: '发布站点',
            items: [
                { text: '本地搜索', url: '/publishing' },
                { text: '构建与部署', url: '/publishing/build-and-deploy' },
            ],
        }],
    },
])
```

目录断言期望 `['getting-started', 'publishing', 'writing']`，并逐页根据路径第一段
断言对应 `section`。公开文件列表使用 `documentationPages`。

- [ ] **Step 2: 增加 Aside 注册与渲染测试**

创建 `src/components/aside.test.js`：

```js
import React from 'react'
import { render, screen } from '@testing-library/react'

import Aside from './aside'
import { remarkComponents } from '../remark'

test('registers Aside for direct use in MDX examples', () => {
    expect(remarkComponents.Aside).toBe(Aside)
})

test('renders a titled Example as complementary content', () => {
    render(
        <Aside title="Example">
            <code>npm run dev</code>
        </Aside>
    )

    expect(screen.getByRole('complementary')).toHaveTextContent('npm run dev')
    expect(screen.getByText('Example')).toBeInTheDocument()
})
```

- [ ] **Step 3: 运行测试并观察预期失败**

Run:

```bash
npm test -- --runInBand test/templateContent.test.js src/components/aside.test.js
```

Expected: FAIL；旧 `/guide` 结构仍存在，且 `remarkComponents.Aside` 为
`undefined`。

- [ ] **Step 4: 提交红灯测试**

```bash
git add test/templateContent.test.js src/components/aside.test.js
git commit -m "test: define hierarchical documentation layout"
```

### Task 2: 配置三个顶部大章节

**Files:**
- Modify: `meta/site.json`
- Modify: `meta/sidebars.json`
- Modify: `README.md`
- Modify: `AGENTS.md`

- [ ] **Step 1: 更新站点 sections 与顶部 navigation**

`meta/site.json` 使用 Task 1 中的三个 sections，并将 navigation 改为：

```json
[
    { "text": "入门", "url": "/getting-started" },
    { "text": "编写", "url": "/writing" },
    { "text": "发布", "url": "/publishing" }
]
```

页脚的文档入口改为：

```json
[
    { "text": "模板概览", "url": "/getting-started" },
    { "text": "编写文档", "url": "/writing" },
    { "text": "构建与部署", "url": "/publishing/build-and-deploy" }
]
```

- [ ] **Step 2: 更新三个独立侧边栏**

`meta/sidebars.json` 使用 Task 1 中的三个 sidebar 对象。每个对象只包含当前大章节
的小页面，使 `Docs` 按 frontmatter 的 `section` 自动选择对应左侧导航。

- [ ] **Step 3: 更新公开说明中的路径**

README 的站内手册链接改为 `/getting-started`。AGENTS 增加一条约定：

```markdown
- 顶部大章节定义在 `meta/site.json`，每章的小页面定义在 `meta/sidebars.json`。
```

- [ ] **Step 4: 运行模板测试确认配置期望已满足**

Run:

```bash
npm test -- --runInBand test/templateContent.test.js
```

Expected: 仍因新文档目录未创建而 FAIL，但 sections 和 sidebars 的 equality
断言通过。

- [ ] **Step 5: 提交大章节配置**

```bash
git add meta/site.json meta/sidebars.json README.md AGENTS.md
git commit -m "refactor: split template guide into top-level sections"
```

### Task 3: 迁移七篇手册并加入右侧 Example

**Files:**
- Move: `docs/guide/index.mdx` → `docs/getting-started/index.mdx`
- Move: `docs/guide/getting-started.mdx` → `docs/getting-started/quickstart.mdx`
- Move: `docs/guide/site-configuration.mdx` → `docs/getting-started/site-configuration.mdx`
- Move: `docs/guide/organizing-docs.mdx` → `docs/writing/index.mdx`
- Move: `docs/guide/mdx-components.mdx` → `docs/writing/mdx-components.mdx`
- Move: `docs/guide/search.mdx` → `docs/publishing/index.mdx`
- Move: `docs/guide/build-and-deploy.mdx` → `docs/publishing/build-and-deploy.mdx`
- Modify: `src/remark.js`

- [ ] **Step 1: 注册 Aside MDX 组件**

`src/remark.js` 已导入 `Aside`；在 `remarkComponents` 中加入：

```js
Aside,
```

Run:

```bash
npm test -- --runInBand src/components/aside.test.js
```

Expected: PASS，2 个测试通过。

- [ ] **Step 2: 按信息架构移动文档**

移动七篇文档后，将 frontmatter section 分别改为
`getting-started`、`writing`、`publishing`。将所有 `/guide` 内部链接替换为新路由：

```text
/guide                         -> /getting-started
/guide/getting-started         -> /getting-started/quickstart
/guide/site-configuration      -> /getting-started/site-configuration
/guide/organizing-docs         -> /writing
/guide/mdx-components          -> /writing/mdx-components
/guide/search                  -> /publishing
/guide/build-and-deploy        -> /publishing/build-and-deploy
```

- [ ] **Step 3: 给关键小节加入真实 Example**

使用以下结构把示例放到解释其用途的小节内：

````mdx
<Aside title="Example">

```bash
npm install
npm run dev
```

</Aside>
````

至少加入：

- `quickstart.mdx`：安装和启动命令。
- `site-configuration.mdx`：完整 `site.json` 片段。
- `writing/index.mdx`：frontmatter 与 sidebar 配置片段。
- `mdx-components.mdx`：Infobox、Button、Accordion、Grid 和 Aside 示例。
- `publishing/index.mdx`：`npm run preview:search`。
- `build-and-deploy.mdx`：发布检查命令与 `SITE_URL` 构建命令。

正文仍保留对命令或配置的解释；Example 不应成为没有上下文的代码堆叠。

- [ ] **Step 4: 在 MDX 组件页记录 Aside**

增加 `Aside` 小节，明确：

- 桌面端位于相关正文右侧。
- 移动端回到正文流。
- 应放在对应 `##` 小节内。
- 示例内容应短小、完整、可执行。

- [ ] **Step 5: 运行结构与组件测试**

Run:

```bash
npm test -- --runInBand test/templateContent.test.js src/components/aside.test.js
```

Expected: PASS，模板结构与 Aside 测试全部通过。

- [ ] **Step 6: 扫描旧路由**

Run:

```bash
rg -n "/guide|section: guide" README.md AGENTS.md meta pages src docs/getting-started docs/writing docs/publishing
```

Expected: 无匹配。

- [ ] **Step 7: 提交文档迁移和 Example**

```bash
git add docs/guide docs/getting-started docs/writing docs/publishing src/remark.js
git commit -m "docs: showcase section navigation and examples"
```

### Task 4: 让首页突出模板特点

**Files:**
- Modify: `pages/index.tsx`

- [ ] **Step 1: 写首页内容测试**

在 `test/templateContent.test.js` 增加：

```js
test('homepage highlights the three template capabilities', () => {
    const homepage = read('pages/index.tsx')

    expect(homepage).toContain('配置驱动')
    expect(homepage).toContain('MDX 与 Example')
    expect(homepage).toContain('本地搜索与静态部署')
    expect(homepage).toContain('url="/getting-started"')
    expect(homepage).toContain('url="/writing/mdx-components"')
    expect(homepage).toContain('url="/publishing"')
})
```

Run:

```bash
npm test -- --runInBand test/templateContent.test.js
```

Expected: FAIL，因为首页目前只有一个“模板使用手册”卡片。

- [ ] **Step 2: 改为三个特点卡片**

保留 Landing 布局，将 `LandingGrid` 改为三个卡片：

```tsx
<LandingGrid blocks>
    <LandingCard title="配置驱动" url="/getting-started" button="开始使用">
        通过站点元数据和侧边栏配置组织大章节、小页面与阅读顺序。
    </LandingCard>
    <LandingCard title="MDX 与 Example" url="/writing/mdx-components" button="编写文档">
        使用 MDX 组件编写内容，并把可执行示例放在相关正文右侧。
    </LandingCard>
    <LandingCard title="本地搜索与静态部署" url="/publishing" button="发布站点">
        使用 Pagefind 生成本地索引，并把静态导出部署到任意托管平台。
    </LandingCard>
</LandingGrid>
```

- [ ] **Step 3: 运行首页内容测试**

Run:

```bash
npm test -- --runInBand test/templateContent.test.js
```

Expected: PASS。

- [ ] **Step 4: 提交首页改写**

```bash
git add test/templateContent.test.js pages/index.tsx
git commit -m "docs: highlight template capabilities"
```

### Task 5: 完整验证桌面布局、移动布局和搜索

**Files:**
- Modify only if verification finds a reproducible defect.

- [ ] **Step 1: 运行全部测试**

Run:

```bash
npm test -- --runInBand
```

Expected: 所有测试通过。

- [ ] **Step 2: 运行 lint**

Run:

```bash
npm run lint
```

Expected: exit 0；允许记录现有 `src/components/embed.js` 的 `<img>` warning。

- [ ] **Step 3: 运行生产构建**

Run:

```bash
npm run build
```

Expected: 导出 7 篇手册页面；Pagefind 索引 7 页。

- [ ] **Step 4: 检查静态路由与旧路由清理**

Run:

```bash
test -f out/getting-started.html
test -f out/getting-started/quickstart.html
test -f out/writing.html
test -f out/publishing.html
test ! -e out/guide.html
test ! -d out/guide
```

Expected: 所有命令 exit 0。

- [ ] **Step 5: 启动静态搜索预览并做浏览器验证**

启动 `node scripts/serve-search-preview.mjs` 后验证：

- 桌面宽度：首页三个特点卡片可见。
- `/getting-started/quickstart` 顶部三个大章节可见，“入门”高亮。
- 左侧只显示入门页面，当前页小节嵌套显示。
- Example 位于对应正文右侧。
- 移动宽度下顶部与左侧变为选择器，Example 回到正文下方。
- 搜索“配置”能返回新路由，点击后进入对应页面。

- [ ] **Step 6: 最终仓库检查**

Run:

```bash
git status --short
git diff --check origin/main...HEAD
git log --oneline --decorate origin/main..HEAD
```

Expected: 工作区干净；无空白错误；提交只包含模板设计、计划、测试、导航、手册、
Example 和首页改造。
