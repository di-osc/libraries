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
                <LandingCard title="配置驱动" url="/getting-started" button="开始使用">
                    通过站点元数据和侧边栏配置组织大章节、小页面与阅读顺序。
                </LandingCard>
                <LandingCard
                    title="MDX 与 Example"
                    url="/writing/mdx-components"
                    button="编写文档"
                >
                    使用 MDX 组件编写内容，并把可执行示例放在相关正文右侧。
                </LandingCard>
                <LandingCard title="本地搜索与静态部署" url="/publishing" button="发布站点">
                    使用 Pagefind 生成本地索引，并把静态导出部署到任意托管平台。
                </LandingCard>
            </LandingGrid>
        </Layout>
    )
}
