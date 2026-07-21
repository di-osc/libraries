const loadGeneratedPagefind = attempt => {
    if (attempt === 0) {
        return import(/* webpackIgnore: true */ '/pagefind/pagefind.js')
    }

    return import(/* webpackIgnore: true */ `/pagefind/pagefind.js?retry=${attempt}`)
}

const cleanUrl = url => {
    if (typeof url !== 'string' || !url.trim()) {
        return null
    }

    return url.trim().replace(/\.html(?=$|[?#])/, '')
}

const normalizeResult = (result, page) => {
    const url = cleanUrl(page?.url)

    if (!url) {
        return []
    }

    const title = page?.meta?.title || url
    const subResults = Array.isArray(page?.sub_results) ? page.sub_results : []

    if (!subResults.length) {
        return [{
            id: url,
            url,
            title,
            section: null,
            excerpt: page?.excerpt,
            score: result.score,
        }]
    }

    return subResults.flatMap(subResult => {
        if (!subResult || typeof subResult !== 'object') {
            return []
        }

        const subResultUrl = cleanUrl(subResult.url)

        if (!subResultUrl) {
            return []
        }

        return {
            id: subResultUrl,
            url: subResultUrl,
            title,
            section: subResult.anchor ? subResult.title : null,
            excerpt: subResult.excerpt,
            score: result.score,
        }
    })
}

export const createPagefindClient = (load = loadGeneratedPagefind) => {
    let modulePromise = null
    let attempt = 0

    const getPagefind = () => {
        if (!modulePromise) {
            const loadAttempt = attempt

            modulePromise = Promise.resolve()
                .then(() => load(loadAttempt))
                .then(module => module.default || module)
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
            attempt += 1
        },
    }
}

export const pagefindClient = createPagefindClient()
