export const normalizeBasePath = value => {
    const path = typeof value === 'string' ? value.trim() : ''

    if (!path || path === '/') {
        return ''
    }

    return `/${path.replace(/^\/+|\/+$/g, '')}`
}

export const basePath = normalizeBasePath(process.env.NEXT_PUBLIC_BASE_PATH)

export const withBasePath = (path, deploymentBasePath = basePath) => {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`

    return `${normalizeBasePath(deploymentBasePath)}${normalizedPath}`
}
