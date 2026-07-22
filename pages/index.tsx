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
                <LandingTitle>开源库文档</LandingTitle>
                <LandingSubtitle>API 参考、使用指南与最佳实践</LandingSubtitle>
            </LandingHeader>
            <LandingGrid blocks>
                <LandingCard title="asr-data" url="/asr-data" button="查看文档">
                    面向自动语音识别的数据模型、音频处理与 SQLite 存储库，提供 Rust
                    核心和 Python API。
                </LandingCard>
                <LandingCard title="vad-burn" url="/vad-burn" button="查看文档">
                    基于 Burn 的高性能语音活动检测库，支持 Rust、Python、离线推理、
                    流式推理和 FSMN Metal 后端。
                </LandingCard>
            </LandingGrid>
        </Layout>
    )
}
