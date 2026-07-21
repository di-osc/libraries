const loadGeneratedPagefind = () => import(/* webpackIgnore: true */ '/pagefind/pagefind.js')

const cleanUrl = url => url.replace(/\.html(?=$|[?#])/, '')

const normalizeResult = (result, page) => {
    const url = cleanUrl(page.url)
    const title = page.meta.title

    if (!page.sub_results.length) {
        return [{
            id: url,
            url,
            title,
            section: null,
            excerpt: page.excerpt,
            score: result.score,
        }]
    }

    return page.sub_results.map(subResult => {
        const subResultUrl = cleanUrl(subResult.url)

        return {
            id: subResultUrl,
            url: subResultUrl,
            title,
            section: subResult.title,
            excerpt: subResult.excerpt,
            score: result.score,
        }
    })
}

export const createPagefindClient = (load = loadGeneratedPagefind) => {
    let modulePromise = null

    const getPagefind = () => {
        if (!modulePromise) {
            modulePromise = Promise.resolve().then(load).then(module => module.default || module)
        }

        return modulePromise
    }

    return {
        async search(query) {
            const normalizedQuery = query.trim()

            if (!normalizedQuery) {
                return []
            }

            const pagefind = await getPagefind()
            const response = await pagefind.search(normalizedQuery)
            const pages = await Promise.all(response.results.map(result => result.data()))

            return response.results.flatMap((result, index) => normalizeResult(result, pages[index]))
        },
        retry() {
            modulePromise = null
        },
    }
}

export const pagefindClient = createPagefindClient()
