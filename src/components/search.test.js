import React from 'react'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TextEncoder } from 'util'

import Search from './search'

global.TextEncoder = TextEncoder
const { renderToString } = require('react-dom/server')

const createClient = overrides => ({
    search: jest.fn().mockResolvedValue([]),
    retry: jest.fn(),
    ...overrides,
})

const deferred = () => {
    let resolve
    let reject
    const promise = new Promise((resolvePromise, rejectPromise) => {
        resolve = resolvePromise
        reject = rejectPromise
    })

    return { promise, resolve, reject }
}

const openSearch = async (user, client = createClient()) => {
    render(<Search client={client} />)
    await user.click(screen.getByRole('button', { name: '搜索文档' }))
    return client
}

test('opens with the idle prompt, focuses the input, and Escape restores trigger focus', async () => {
    const user = userEvent.setup()
    const client = await openSearch(user)

    const trigger = screen.getByRole('button', { name: '搜索文档' })
    const dialog = screen.getByRole('dialog', { name: '搜索文档' })
    const input = screen.getByRole('searchbox')

    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(screen.getByRole('listbox', { name: '搜索结果' })).toBeInTheDocument()
    expect(screen.getByText('输入关键词搜索文档')).toBeInTheDocument()
    expect(input).toHaveFocus()
    expect(client.search).not.toHaveBeenCalled()

    await user.keyboard('{Escape}')

    expect(screen.queryByRole('dialog', { name: '搜索文档' })).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
})

test('Ctrl+K opens the dialog and renders the non-Mac shortcut', async () => {
    const platform = jest.spyOn(window.navigator, 'platform', 'get').mockReturnValue('Linux x86_64')
    const user = userEvent.setup()
    render(<Search client={createClient()} />)

    expect(screen.getByText('Ctrl K')).toBeInTheDocument()
    await user.keyboard('{Control>}k{/Control}')

    expect(screen.getByRole('dialog', { name: '搜索文档' })).toBeInTheDocument()
    expect(screen.getByRole('searchbox')).toHaveFocus()
    platform.mockRestore()
})

test('server and first client markup use Ctrl before hydrating the Mac shortcut', async () => {
    const platform = jest.spyOn(window.navigator, 'platform', 'get').mockReturnValue('MacIntel')
    const client = createClient()
    const markup = renderToString(<Search client={client} />)

    expect(markup).toContain('Ctrl K')

    const container = document.createElement('div')
    container.innerHTML = markup
    document.body.appendChild(container)
    const error = jest.spyOn(console, 'error').mockImplementation(() => {})

    render(<Search client={client} />, { container, hydrate: true })

    expect(await screen.findByText('⌘ K')).toBeInTheDocument()
    expect(error).not.toHaveBeenCalled()
    error.mockRestore()
    platform.mockRestore()
})

test('searches and renders result links with path and highlighted excerpt', async () => {
    const client = createClient({
        search: jest.fn().mockResolvedValue([{
            id: 'guide-install',
            url: '/guide#install',
            title: '安装指南',
            section: '快速开始',
            excerpt: '运行 <mark>安装</mark> 命令',
        }]),
    })
    const user = userEvent.setup()
    await openSearch(user, client)

    await user.type(screen.getByRole('searchbox'), '安装')

    const result = await screen.findByRole('option', { name: /安装指南/ })
    expect(client.search).toHaveBeenCalledWith('安装')
    expect(result).toHaveAttribute('href', '/guide#install')
    expect(screen.getByText('快速开始')).toBeInTheDocument()
    expect(screen.getByText('安装', { selector: 'mark' })).toBeInTheDocument()
})

test('shows loading and then the no-results state', async () => {
    const pending = deferred()
    const client = createClient({ search: jest.fn().mockReturnValue(pending.promise) })
    const user = userEvent.setup()
    await openSearch(user, client)

    await user.type(screen.getByRole('searchbox'), 'missing')
    expect(screen.getByText('正在搜索…')).toBeInTheDocument()

    await act(async () => pending.resolve([]))

    expect(await screen.findByText('未找到相关文档')).toBeInTheDocument()
})

test('shows an error and retry reruns the same query', async () => {
    let shouldFail = true
    const client = createClient({
        search: jest.fn(() => shouldFail
            ? Promise.reject(new Error('missing index'))
            : Promise.resolve([{ id: 'recovered', url: '/recovered', title: '恢复成功' }])),
        retry: jest.fn(() => { shouldFail = false }),
    })
    const user = userEvent.setup()
    await openSearch(user, client)

    await user.type(screen.getByRole('searchbox'), '索')

    expect(await screen.findByText('搜索索引暂时不可用。开发环境请运行 npm run preview:search。')).toBeInTheDocument()
    expect(screen.getByRole('listbox', { name: '搜索结果' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '重新加载' }))

    expect(client.retry).toHaveBeenCalledTimes(1)
    expect(client.search).toHaveBeenNthCalledWith(2, '索')
    expect(await screen.findByRole('option', { name: '恢复成功' })).toBeInTheDocument()
})

test('results start selected and Arrow keys move and wrap selection', async () => {
    const client = createClient({
        search: jest.fn().mockResolvedValue([
            { id: 'one', url: '/one', title: '第一个结果' },
            { id: 'two', url: '/two', title: '第二个结果' },
        ]),
    })
    const user = userEvent.setup()
    await openSearch(user, client)
    const input = screen.getByRole('searchbox')

    await user.type(input, '结果')
    const options = await screen.findAllByRole('option')

    expect(options[0]).toHaveAttribute('aria-selected', 'true')

    await user.keyboard('{ArrowDown}')
    expect(options[1]).toHaveAttribute('aria-selected', 'true')

    await user.keyboard('{ArrowDown}')
    expect(options[0]).toHaveAttribute('aria-selected', 'true')

    await user.keyboard('{ArrowUp}')
    expect(options[1]).toHaveAttribute('aria-selected', 'true')
})

test('Enter immediately activates the initially selected first result', async () => {
    const client = createClient({
        search: jest.fn().mockResolvedValue([
            { id: 'one', url: '/one', title: '第一个结果' },
            { id: 'two', url: '/two', title: '第二个结果' },
        ]),
    })
    const click = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    const user = userEvent.setup()
    await openSearch(user, client)

    await user.type(screen.getByRole('searchbox'), '结果')
    const options = await screen.findAllByRole('option')
    await user.keyboard('{Enter}')

    expect(click).toHaveBeenCalledTimes(1)
    expect(click.mock.instances[0]).toBe(options[0])
    click.mockRestore()
})

test('backdrop clicks close the dialog while clicks inside do not', async () => {
    const user = userEvent.setup()
    await openSearch(user)

    const dialog = screen.getByRole('dialog', { name: '搜索文档' })
    await user.click(dialog)
    expect(dialog).toBeInTheDocument()

    await user.click(dialog.parentElement)
    expect(screen.queryByRole('dialog', { name: '搜索文档' })).not.toBeInTheDocument()
})

test('a stale result cannot replace the newer query result', async () => {
    const first = deferred()
    const second = deferred()
    const client = createClient({
        search: jest.fn(query => query === 'first' ? first.promise : second.promise),
    })
    const user = userEvent.setup()
    await openSearch(user, client)
    const input = screen.getByRole('searchbox')

    await user.type(input, 'first')
    await user.clear(input)
    await user.type(input, 'second')
    await act(async () => second.resolve([{ id: 'new', url: '/new', title: 'New result' }]))
    expect(await screen.findByRole('option', { name: 'New result' })).toBeInTheDocument()

    await act(async () => first.resolve([{ id: 'old', url: '/old', title: 'Old result' }]))
    expect(screen.queryByText('Old result')).not.toBeInTheDocument()
    expect(screen.getByText('New result')).toBeInTheDocument()
})

test('a stale rejection cannot replace the newer successful query', async () => {
    const first = deferred()
    const second = deferred()
    const client = createClient({
        search: jest.fn(query => query === 'first' ? first.promise : second.promise),
    })
    const user = userEvent.setup()
    await openSearch(user, client)
    const input = screen.getByRole('searchbox')

    await user.type(input, 'first')
    await user.clear(input)
    await user.type(input, 'second')
    await act(async () => second.resolve([{ id: 'new', url: '/new', title: 'New result' }]))
    expect(await screen.findByRole('option', { name: 'New result' })).toBeInTheDocument()

    await act(async () => first.reject(new Error('stale failure')))
    expect(screen.queryByText('搜索索引暂时不可用。开发环境请运行 npm run preview:search。')).not.toBeInTheDocument()
    expect(screen.getByText('New result')).toBeInTheDocument()
})

test('unmounting with a pending query does not update state', async () => {
    const pending = deferred()
    const client = createClient({ search: jest.fn().mockReturnValue(pending.promise) })
    const error = jest.spyOn(console, 'error').mockImplementation(() => {})
    const user = userEvent.setup()
    const { unmount } = render(<Search client={client} />)

    await user.click(screen.getByRole('button', { name: '搜索文档' }))
    await user.type(screen.getByRole('searchbox'), 'pending')
    unmount()
    await act(async () => pending.resolve([{ id: 'late', url: '/late', title: 'Late result' }]))

    expect(error).not.toHaveBeenCalled()
    error.mockRestore()
})
