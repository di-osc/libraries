# GitHub Pages Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让模板自带 GitHub Pages 自动部署工作流，并同时支持根站点与普通仓库的 `/repo` 子路径。

**Architecture:** 使用 `actions/configure-pages` 提供的 `base_url` 与 `base_path` 作为唯一部署元数据。Next.js 在构建时读取 `NEXT_PUBLIC_BASE_PATH`，公共资源与 Pagefind 复用一个小型路径工具；sitemap 直接使用 Pages 返回的完整站点 URL。

**Tech Stack:** Next.js 13 static export、Pagefind、Jest、GitHub Actions、GitHub Pages

---

### Task 1: 定义子路径行为

**Files:**
- Create: `src/basePath.js`
- Create: `src/basePath.test.js`
- Modify: `src/search/pagefind.js`
- Modify: `src/search/pagefind.test.js`
- Modify: `pages/_app.tsx`
- Create: `pages/_app.test.tsx`

- [ ] **Step 1: 为路径工具和 Pagefind 配置写失败测试**

覆盖空路径、`/repo/` 归一化、公共资源前缀、Pagefind bundle URL、`baseUrl` 只配置一次，以及重试时保留正确子路径。

- [ ] **Step 2: 运行测试并确认因缺少实现而失败**

Run: `npm test -- --runInBand src/basePath.test.js src/search/pagefind.test.js pages/_app.test.tsx`

Expected: FAIL，原因是路径工具不存在，Pagefind 未配置子路径，Head 链接仍指向根路径。

- [ ] **Step 3: 实现最小路径工具并接入运行时**

`src/basePath.js` 导出归一化后的 `basePath` 与 `withBasePath(path)`。Pagefind 从
`${basePath}/pagefind/pagefind.js` 加载，并执行
`pagefind.options({ baseUrl: `${basePath}/` })`；`_app.tsx` 使用同一工具生成 manifest 与 sitemap 链接。

- [ ] **Step 4: 运行定向测试并确认通过**

Run: `npm test -- --runInBand src/basePath.test.js src/search/pagefind.test.js pages/_app.test.tsx`

Expected: PASS。

### Task 2: 让静态构建识别 GitHub Pages 元数据

**Files:**
- Modify: `next.config.mjs`
- Modify: `public/manifest.webmanifest`
- Modify: `test/templateContent.test.js`

- [ ] **Step 1: 为构建配置和相对 PWA 路径写失败断言**

断言 Next 配置声明 `basePath`，manifest 的 `scope` 与 `start_url` 使用相对值，避免普通仓库站点跳出 `/repo`。

- [ ] **Step 2: 运行测试并确认失败**

Run: `npm test -- --runInBand test/templateContent.test.js`

Expected: FAIL，原因是当前配置固定在 `/`。

- [ ] **Step 3: 接入 `NEXT_PUBLIC_BASE_PATH`**

在 `next.config.mjs` 规范化环境变量并传给 `basePath`；将 manifest 的
`scope`、`start_url` 改为 `.`。

- [ ] **Step 4: 运行定向测试并确认通过**

Run: `npm test -- --runInBand test/templateContent.test.js`

Expected: PASS。

### Task 3: 添加 GitHub Pages 工作流

**Files:**
- Create: `.github/workflows/deploy-pages.yml`
- Modify: `test/templateContent.test.js`

- [ ] **Step 1: 写工作流结构的失败断言**

断言工作流监听 `main` 与手动触发，使用 `configure-pages@v5`、
`upload-pages-artifact@v4`、`deploy-pages@v4`，把 `base_path` 和 `base_url`
传给构建，并包含 Pages 所需权限、环境及 build/deploy 依赖。

- [ ] **Step 2: 运行测试并确认失败**

Run: `npm test -- --runInBand test/templateContent.test.js`

Expected: FAIL，原因是工作流文件不存在。

- [ ] **Step 3: 添加官方 Pages Actions 工作流**

构建 job 使用 Node 24、`npm ci`、`npm run build` 并上传 `out/`；部署 job
使用 `github-pages` environment，输出真实页面 URL。

- [ ] **Step 4: 运行定向测试并确认通过**

Run: `npm test -- --runInBand test/templateContent.test.js`

Expected: PASS。

### Task 4: 编写中文部署手册

**Files:**
- Modify: `docs/publishing/build-and-deploy.mdx`
- Modify: `test/templateContent.test.js`

- [ ] **Step 1: 写部署手册内容的失败断言**

断言手册说明 Pages Source 选择 `GitHub Actions`、推送 `main`、普通仓库 URL、
用户站点 URL、工作流文件位置、首次部署查看方式，以及无需手工填写仓库子路径。

- [ ] **Step 2: 运行测试并确认失败**

Run: `npm test -- --runInBand test/templateContent.test.js`

Expected: FAIL，原因是手册尚未包含完整 GitHub Pages 章节。

- [ ] **Step 3: 扩展“构建与部署”页面**

增加“部署到 GitHub Pages”菜单与完整步骤，解释 Actions 如何自动注入
`NEXT_PUBLIC_BASE_PATH` 和 `SITE_URL`，并保留通用静态托管与 Vercel 内容。

- [ ] **Step 4: 运行定向测试并确认通过**

Run: `npm test -- --runInBand test/templateContent.test.js`

Expected: PASS。

### Task 5: 验证根路径与仓库子路径

**Files:**
- Verify: `out/`

- [ ] **Step 1: 运行完整测试与 lint**

Run: `npm test -- --runInBand && npm run lint`

Expected: 所有测试通过；lint 无错误。

- [ ] **Step 2: 验证默认根路径构建**

Run: `npm run build`

Expected: 静态导出与 Pagefind 索引成功。

- [ ] **Step 3: 验证 GitHub 项目站点构建**

Run: `NEXT_PUBLIC_BASE_PATH=/libraries SITE_URL=https://di-osc.github.io/libraries npm run build`

Expected: 构建成功；导出的 HTML 资源、manifest、sitemap 与 Pagefind 均使用
`/libraries` 或完整 Pages URL。

- [ ] **Step 4: 检查最终差异并提交**

Run: `git diff --check && git status --short`

Expected: 无空白错误，只包含本次 Pages 部署相关文件。
