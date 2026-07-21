import React, { useCallback, useEffect, useRef, useState } from 'react'
import PropTypes from 'prop-types'
import classNames from 'classnames'

import { pagefindClient } from '../search/pagefind'
import classes from '../styles/search.module.sass'

const getShortcut = () => {
    const platform = typeof navigator === 'undefined' ? '' : navigator.platform
    return /Mac|iPhone|iPad|iPod/.test(platform) ? '⌘ K' : 'Ctrl K'
}

export default function Search({ client }) {
    const [isOpen, setIsOpen] = useState(false)
    const [query, setQuery] = useState('')
    const [results, setResults] = useState([])
    const [status, setStatus] = useState('idle')
    const [selectedIndex, setSelectedIndex] = useState(-1)
    const [retryVersion, setRetryVersion] = useState(0)
    const requestId = useRef(0)
    const triggerRef = useRef(null)
    const inputRef = useRef(null)
    const resultRefs = useRef([])
    const mountedRef = useRef(true)
    const wasOpenRef = useRef(false)

    const open = useCallback(() => setIsOpen(true), [])
    const close = useCallback(() => {
        requestId.current += 1
        setIsOpen(false)
    }, [])

    useEffect(() => {
        mountedRef.current = true
        return () => {
            mountedRef.current = false
            requestId.current += 1
        }
    }, [])

    useEffect(() => {
        const handleGlobalKeyDown = event => {
            if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
                event.preventDefault()
                open()
            } else if (event.key === 'Escape' && isOpen) {
                event.preventDefault()
                close()
            }
        }

        window.addEventListener('keydown', handleGlobalKeyDown)
        return () => window.removeEventListener('keydown', handleGlobalKeyDown)
    }, [close, isOpen, open])

    useEffect(() => {
        if (isOpen) {
            inputRef.current?.focus()
        } else if (wasOpenRef.current) {
            triggerRef.current?.focus()
        }

        wasOpenRef.current = isOpen
    }, [isOpen])

    useEffect(() => {
        if (!isOpen) {
            return undefined
        }

        const normalizedQuery = query.trim()
        const currentRequest = requestId.current + 1
        requestId.current = currentRequest

        if (!normalizedQuery) {
            setStatus('idle')
            setResults([])
            setSelectedIndex(-1)
            return undefined
        }

        let cancelled = false
        setStatus('loading')
        setResults([])
        setSelectedIndex(-1)

        Promise.resolve(client.search(normalizedQuery)).then(nextResults => {
            if (cancelled || !mountedRef.current || requestId.current !== currentRequest) {
                return
            }

            const normalizedResults = Array.isArray(nextResults) ? nextResults : []
            setResults(normalizedResults)
            setSelectedIndex(-1)
            setStatus('success')
        }).catch(() => {
            if (cancelled || !mountedRef.current || requestId.current !== currentRequest) {
                return
            }

            setResults([])
            setSelectedIndex(-1)
            setStatus('error')
        })

        return () => {
            cancelled = true
        }
    }, [client, isOpen, query, retryVersion])

    useEffect(() => {
        resultRefs.current = resultRefs.current.slice(0, results.length)
        setSelectedIndex(index => {
            if (!results.length || index < 0) {
                return -1
            }
            return Math.min(index, results.length - 1)
        })
    }, [results])

    const handleRetry = () => {
        client.retry()
        setRetryVersion(version => version + 1)
    }

    const handleInputKeyDown = event => {
        if (!results.length) {
            return
        }

        if (event.key === 'ArrowDown') {
            event.preventDefault()
            setSelectedIndex(index => index < 0 ? 0 : (index + 1) % results.length)
        } else if (event.key === 'ArrowUp') {
            event.preventDefault()
            setSelectedIndex(index => index < 0 ? results.length - 1 : (index - 1 + results.length) % results.length)
        } else if (event.key === 'Enter' && selectedIndex >= 0) {
            event.preventDefault()
            resultRefs.current[selectedIndex]?.click()
        }
    }

    return (
        <>
            <button
                ref={triggerRef}
                type="button"
                className={classes.trigger}
                aria-label="搜索文档"
                onClick={open}
            >
                <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20">
                    <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
                    <path d="m16 16 5 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                <span className={classes['trigger-label']}>搜索文档</span>
                <span className={classes.shortcut} aria-hidden="true">{getShortcut()}</span>
            </button>

            {isOpen && (
                <div
                    className={classes.backdrop}
                    onPointerDown={event => {
                        if (event.target === event.currentTarget) {
                            close()
                        }
                    }}
                >
                    <section
                        className={classes.dialog}
                        role="dialog"
                        aria-modal="true"
                        aria-label="搜索文档"
                    >
                        <div className={classes['search-row']}>
                            <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20">
                                <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
                                <path d="m16 16 5 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                            <input
                                ref={inputRef}
                                className={classes.input}
                                type="search"
                                role="searchbox"
                                aria-label="搜索关键词"
                                placeholder="搜索文档"
                                value={query}
                                onChange={event => setQuery(event.target.value)}
                                onKeyDown={handleInputKeyDown}
                            />
                        </div>

                        <div className={classes.results} role={results.length ? 'listbox' : undefined} aria-label={results.length ? '搜索结果' : undefined}>
                            {status === 'idle' && <p className={classes.state}>输入关键词搜索文档</p>}
                            {status === 'loading' && <p className={classes.state}>正在搜索…</p>}
                            {status === 'success' && !results.length && <p className={classes.state}>未找到相关文档</p>}
                            {status === 'error' && (
                                <div className={classes.state}>
                                    <p>搜索索引暂时不可用。开发环境请运行 npm run preview:search。</p>
                                    <button type="button" className={classes.retry} onClick={handleRetry}>重新加载</button>
                                </div>
                            )}
                            {status === 'success' && results.map((result, index) => (
                                <a
                                    key={result.id || result.url}
                                    ref={element => { resultRefs.current[index] = element }}
                                    className={classNames(classes.result, {
                                        [classes['is-selected']]: index === selectedIndex,
                                    })}
                                    role="option"
                                    aria-selected={index === selectedIndex}
                                    href={result.url}
                                    onMouseEnter={() => setSelectedIndex(index)}
                                >
                                    <strong>{result.title}</strong>
                                    {result.section && <span className={classes['result-path']}>{result.section}</span>}
                                    {result.excerpt && (
                                        <span
                                            className={classes.excerpt}
                                            dangerouslySetInnerHTML={{ __html: result.excerpt }}
                                        />
                                    )}
                                </a>
                            ))}
                        </div>

                        <footer className={classes.footer}>↑↓ 选择 · Enter 打开 · Esc 关闭</footer>
                    </section>
                </div>
            )}
        </>
    )
}

Search.propTypes = {
    client: PropTypes.shape({
        search: PropTypes.func.isRequired,
        retry: PropTypes.func.isRequired,
    }),
}

Search.defaultProps = {
    client: pagefindClient,
}
