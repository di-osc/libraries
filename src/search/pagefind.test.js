import { createPagefindClient } from './pagefind'

const rawPageResult = {
    url: '/asr-data/annotations.html',
    meta: {
        title: '时间轴与标注',
    },
    excerpt: '使用 <mark>时间轴</mark> 管理标注',
    sub_results: [{
        title: 'Annotation 类型',
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
    expect(load).toHaveBeenCalledTimes(1)

    client.retry()

    await expect(client.search('third')).resolves.toEqual([])
    expect(load).toHaveBeenCalledTimes(2)
})
