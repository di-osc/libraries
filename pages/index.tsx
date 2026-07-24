import React from 'react'

import Layout from '../src/templates'
import {
    LandingHeader,
    LandingTitle,
    LandingSubtitle,
    LandingGrid,
    LandingCard,
} from '../src/components/landing'
import LinkComponent from '../src/components/link'

const Link = LinkComponent as React.ComponentType<{
    to?: string
    href?: string
    hideIcon?: boolean
    children?: React.ReactNode
}>

export default function Home() {
    return (
        <Layout>
            <LandingHeader>
                <LandingTitle>开源库文档</LandingTitle>
                <LandingSubtitle>API 参考、使用指南与最佳实践</LandingSubtitle>
            </LandingHeader>
            <LandingGrid blocks style={undefined}>
                <LandingCard title="ASR-DATA" url="/asr-data" button="查看文档">
                    面向自动语音识别的数据模型。
                </LandingCard>
                <LandingCard title="VAD-BURN" url="/vad-burn" button="查看文档">
                    基于
                    <Link to="https://github.com/tracel-ai/burn" hideIcon>
                        Burn
                    </Link>
                    的高性能语音活动检测库。
                </LandingCard>
            </LandingGrid>
        </Layout>
    )
}
