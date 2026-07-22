import React from 'react'
import { render, screen } from '@testing-library/react'

import Main from './main'
import { Pre } from './codeBlock'
import Title from './title'
import { H1 } from './typography'
import Docs from '../templates/docs'
import Layout from '../templates'

jest.mock('./sidebar', () => function MockSidebar() {
    return <aside>Sidebar</aside>
})

jest.mock('./footer', () => function MockFooter() {
    return <footer>Footer</footer>
})

jest.mock('./readnext', () => function MockReadNext({ title }) {
    return <span>Read next: {title}</span>
})

jest.mock('./button', () => function MockButton({ children }) {
    return <span>{children}</span>
})

jest.mock('./seo', () => function MockSeo() {
    return null
})

test('Main marks only wrapped article content as the Pagefind body', () => {
    const { container } = render(
        <Main wrapContent footer={<footer>Repeated footer</footer>}>
            Searchable article
        </Main>
    )

    const article = container.querySelector('article')
    expect(article).toHaveAttribute('data-pagefind-body', '')
    expect(article).toHaveTextContent('Searchable article')
    expect(screen.getByText('Repeated footer')).not.toHaveAttribute('data-pagefind-body')
})

test('Pre excludes fenced code from Pagefind', () => {
    const { container } = render(<Pre>const answer = 42</Pre>)

    expect(container.querySelector('pre')).toHaveAttribute('data-pagefind-ignore', '')
})

test('Title exposes Pagefind title metadata on its final h1', () => {
    render(<Title title="Concise document title" data-track-heading="document" />)

    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading).toHaveAttribute('data-pagefind-meta', 'title')
    expect(heading).toHaveAttribute('data-track-heading', 'document')
})

test('heading DOM attributes are forwarded without leaking custom heading props', () => {
    render(
        <H1
            id="api-heading"
            source="module.py"
            tag="stable"
            version="1.0"
            data-heading-kind="api"
        >
            API heading
        </H1>
    )

    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading).toHaveAttribute('data-heading-kind', 'api')
    expect(heading).not.toHaveAttribute('source')
    expect(heading).not.toHaveAttribute('tag')
    expect(heading).not.toHaveAttribute('version')
    expect(heading).not.toHaveAttribute('permalink')
})

test('Docs excludes its entire subfooter while keeping document content searchable', () => {
    const { container } = render(
        <Docs
            pageContext={{
                slug: '/guide/current',
                title: 'Current guide',
                section: 'guide',
                sidebar: [],
                next: { title: 'Following guide', slug: '/guide/next' },
            }}
        >
            <p>Searchable documentation</p>
        </Docs>
    )

    const article = container.querySelector('article[data-pagefind-body=""]')
    const ignoredSubFooter = screen.getByText('建议修改').closest('[data-pagefind-ignore]')
    expect(article).toContainElement(screen.getByText('Searchable documentation'))
    expect(ignoredSubFooter).toHaveAttribute('data-pagefind-ignore', '')
    expect(ignoredSubFooter).toContainElement(screen.getByText('Read next: Following guide'))
})

test('Layout renders one search trigger alongside the navigation progress indicator', () => {
    render(<Layout title="Home">Home content</Layout>)

    expect(screen.getAllByRole('button', { name: '搜索文档' })).toHaveLength(1)
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
})
