import { normalizeBasePath, withBasePath } from './basePath'

test.each([
    [undefined, ''],
    ['', ''],
    ['/', ''],
    ['libraries', '/libraries'],
    ['/libraries/', '/libraries'],
    [' /team/docs/ ', '/team/docs'],
])('normalizes a deployment base path from %p', (value, expected) => {
    expect(normalizeBasePath(value)).toBe(expected)
})

test('prefixes root-relative public files without changing the root deployment', () => {
    expect(withBasePath('/manifest.webmanifest', '')).toBe('/manifest.webmanifest')
    expect(withBasePath('/manifest.webmanifest', '/libraries')).toBe(
        '/libraries/manifest.webmanifest'
    )
})
