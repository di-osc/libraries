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
