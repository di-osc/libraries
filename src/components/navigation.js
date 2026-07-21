import React from 'react'
import PropTypes from 'prop-types'
import classNames from 'classnames'

import Link from './link'
import Dropdown from './dropdown'
import classes from '../styles/navigation.module.sass'

const NavigationDropdown = ({ items = [], section }) => {
    const active = items.find(({ text }) => text.toLowerCase() === section)
    return (
        <Dropdown defaultValue={active?.url || 'title'} className={classes.dropdown}>
            <option value="title" disabled>
                Libraries
            </option>
            {items.map(({ text, url }) => (
                <option key={url} value={url}>
                    {text}
                </option>
            ))}
        </Dropdown>
    )
}

export default function Navigation({ title, items = [], section, children }) {
    return (
        <nav className={classes.root}>
            <Link to="/" aria-label={title} noLinkLayout>
                <span className={classes.title}>{title}</span>
            </Link>
            <div className={classes.menu}>
                <NavigationDropdown items={items} section={section} />
                <ul className={classes.list}>
                    {items.map(({ text, url }) => {
                        const isActive = section === text.toLowerCase()
                        return (
                            <li
                                key={url}
                                className={classNames(classes.item, {
                                    [classes['is-active']]: isActive,
                                })}
                            >
                                <Link to={url} tabIndex={isActive ? '-1' : null} noLinkLayout>
                                    {text}
                                </Link>
                            </li>
                        )
                    })}
                </ul>
            </div>
            {children}
        </nav>
    )
}

Navigation.propTypes = {
    title: PropTypes.string.isRequired,
    items: PropTypes.array,
    section: PropTypes.string,
    children: PropTypes.node,
}
