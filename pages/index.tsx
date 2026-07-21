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
                <LandingTitle>di-osc Libraries</LandingTitle>
                <LandingSubtitle>开源库文档中心</LandingSubtitle>
            </LandingHeader>
            <LandingGrid blocks>
                <LandingCard title="asr-data" url="/asr-data" button="查看文档">
                    面向自动语音识别的数据模型、音频处理与 SQLite 存储库，提供 Rust
                    核心和 Python API。
                </LandingCard>
            </LandingGrid>
        </Layout>
    )
}
