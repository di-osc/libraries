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
[模板使用手册](/getting-started)。

## 致谢

本站模板基于 [spaCy website](https://spacy.io/) 的开源站点架构。
