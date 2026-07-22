import { createPagefindClient } from './pagefind'

const rawPageResult = {
    url: '/asr-data/annotations.html',
    meta: {
        title: '时间轴与标注',
    },
    excerpt: '使用 <mark>时间轴</mark> 管理标注',
    sub_results: [{
        title: 'Annotation 类型',
        anchor: { id: 'annotation-types' },
        url: '/asr-data/annotations.html#annotation-types',
        excerpt: '常用的 <mark>标注</mark> 类型',
    }],
}

test('returns no results for a whitespace query without loading Pagefind', async () => {
    const load = jest.fn()
    const client = createPagefindClient(load)

    await expect(client.search('  \n  ')).resolves.toEqual([])

    expect(load).not.toHaveBeenCalled()
})

test('loads Pagefind once across multiple searches', async () => {
    const pagefind = {
        search: jest.fn().mockResolvedValue({ results: [] }),
    }
    const load = jest.fn().mockResolvedValue({ default: pagefind })
    const client = createPagefindClient(load)

    await client.search('first')
    await client.search('second')

    expect(load).toHaveBeenCalledTimes(1)
    expect(pagefind.search).toHaveBeenNthCalledWith(1, 'first')
    expect(pagefind.search).toHaveBeenNthCalledWith(2, 'second')
})

test('normalizes heading sub-results into stable search objects', async () => {
    const client = createPagefindClient(() => Promise.resolve({
        search: jest.fn().mockResolvedValue({
            results: [{
                score: 8,
                data: async () => rawPageResult,
            }],
        }),
    }))

    await expect(client.search('标注')).resolves.toEqual([{
        id: '/asr-data/annotations#annotation-types',
        url: '/asr-data/annotations#annotation-types',
        title: '时间轴与标注',
        section: 'Annotation 类型',
        excerpt: '常用的 <mark>标注</mark> 类型',
        score: 8,
    }])
})

test('normalizes an h1 sub-result as a page result', async () => {
    const client = createPagefindClient(() => Promise.resolve({
        search: jest.fn().mockResolvedValue({
            results: [{
                score: 8,
                data: async () => ({
                    ...rawPageResult,
                    sub_results: [{
                        title: '时间轴与标注',
                        anchor: { element: 'h1', id: 'timeline-and-annotations' },
                        url: '/asr-data/annotations.html#timeline-and-annotations',
                        excerpt: '使用 <mark>时间轴</mark> 管理标注',
                    }],
                }),
            }],
        }),
    }))

    await expect(client.search('时间轴')).resolves.toEqual([{
        id: '/asr-data/annotations',
        url: '/asr-data/annotations',
        title: '时间轴与标注',
        section: null,
        excerpt: '使用 <mark>时间轴</mark> 管理标注',
        score: 8,
    }])
})

test('removes html only before URL endings, anchors, and query delimiters', async () => {
    const client = createPagefindClient(() => Promise.resolve({
        search: jest.fn().mockResolvedValue({
            results: [{
                score: 1,
                data: async () => ({ ...rawPageResult, sub_results: [] }),
            }, {
                score: 2,
                data: async () => ({
                    ...rawPageResult,
                    url: '/asr-data/annotations.html?view=compact',
                    sub_results: [],
                }),
            }],
        }),
    }))

    await expect(client.search('annotations')).resolves.toEqual([{
        id: '/asr-data/annotations',
        url: '/asr-data/annotations',
        title: '时间轴与标注',
        section: null,
        excerpt: '使用 <mark>时间轴</mark> 管理标注',
        score: 1,
    }, {
        id: '/asr-data/annotations?view=compact',
        url: '/asr-data/annotations?view=compact',
        title: '时间轴与标注',
        section: null,
        excerpt: '使用 <mark>时间轴</mark> 管理标注',
        score: 2,
    }])
})

test('skips malformed pages and uses the clean URL as fallback title', async () => {
    const client = createPagefindClient(() => Promise.resolve({
        search: jest.fn().mockResolvedValue({
            results: [{
                score: 1,
                data: async () => ({ url: null }),
            }, {
                score: 1,
                data: async () => ({ url: '' }),
            }, {
                score: 2,
                data: async () => ({
                    url: '/asr-data/fallback.html',
                    excerpt: 'Fallback excerpt',
                }),
            }],
        }),
    }))

    await expect(client.search('fallback')).resolves.toEqual([{
        id: '/asr-data/fallback',
        url: '/asr-data/fallback',
        title: '/asr-data/fallback',
        section: null,
        excerpt: 'Fallback excerpt',
        score: 2,
    }])
})

test('labels page-level sub-results without anchors separately from headings', async () => {
    const client = createPagefindClient(() => Promise.resolve({
        search: jest.fn().mockResolvedValue({
            results: [{
                score: 8,
                data: async () => ({
                    ...rawPageResult,
                    sub_results: [{
                        title: '时间轴与标注',
                        url: '/asr-data/annotations.html',
                        excerpt: '匹配前言中的 <mark>标注</mark>',
                    }, {
                        title: 'Annotation 类型',
                        anchor: { id: 'annotation-types' },
                        url: '/asr-data/annotations.html#annotation-types',
                        excerpt: '常用的 <mark>标注</mark> 类型',
                    }, null, undefined, 'Unexpected value', {
                        title: 'Missing URL',
                    }, {
                        title: 'Malformed heading',
                        anchor: { id: 'missing-url' },
                        url: null,
                        excerpt: 'Ignored',
                    }, {
                        title: 'Second valid heading',
                        anchor: { id: 'valid-heading' },
                        url: '/asr-data/annotations.html#valid-heading',
                        excerpt: 'Another <mark>标注</mark> result',
                    }],
                }),
            }],
        }),
    }))

    await expect(client.search('标注')).resolves.toEqual([{
        id: '/asr-data/annotations',
        url: '/asr-data/annotations',
        title: '时间轴与标注',
        section: null,
        excerpt: '匹配前言中的 <mark>标注</mark>',
        score: 8,
    }, {
        id: '/asr-data/annotations#annotation-types',
        url: '/asr-data/annotations#annotation-types',
        title: '时间轴与标注',
        section: 'Annotation 类型',
        excerpt: '常用的 <mark>标注</mark> 类型',
        score: 8,
    }, {
        id: '/asr-data/annotations#valid-heading',
        url: '/asr-data/annotations#valid-heading',
        title: '时间轴与标注',
        section: 'Second valid heading',
        excerpt: 'Another <mark>标注</mark> result',
        score: 8,
    }])
})

test('keeps a rejected load cached until retry clears it', async () => {
    const error = new Error('Pagefind unavailable')
    const pagefind = {
        search: jest.fn().mockResolvedValue({ results: [] }),
    }
    const load = jest.fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce({ default: pagefind })
    const client = createPagefindClient(load)

    await expect(client.search('first')).rejects.toThrow(error)
    await expect(client.search('second')).rejects.toThrow(error)
    expect(load).toHaveBeenCalledWith(0)
    expect(load).toHaveBeenCalledTimes(1)

    client.retry()

    await expect(client.search('third')).resolves.toEqual([])
    expect(load).toHaveBeenNthCalledWith(2, 1)
    expect(load).toHaveBeenCalledTimes(2)
})
