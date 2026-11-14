import { createElement } from 'react'
import { render, screen } from '@testing-library/react'
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { getBasename } from './router'

describe('getBasename', () => {
  it('keeps the root basename for local development', () => {
    expect(getBasename('/')).toBe('/')
  })

  it('keeps the trailing slash from a project site base', () => {
    expect(getBasename('/quiz-dock/')).toBe('/quiz-dock/')
  })

  it('adds a trailing slash to a project site base without one', () => {
    expect(getBasename('/quiz-dock')).toBe('/quiz-dock/')
  })

  it('falls back to the root basename for an empty base', () => {
    expect(getBasename('')).toBe('/')
  })

  it('keeps the home link inside the project site scope', () => {
    render(
      createElement(
        MemoryRouter,
        {
          basename: getBasename('/quiz-dock/'),
          initialEntries: ['/quiz-dock/'],
        },
        createElement(Link, { to: '/' }, '題庫'),
      ),
    )

    expect(screen.getByRole('link', { name: '題庫' })).toHaveAttribute(
      'href',
      '/quiz-dock/',
    )
  })

  it('matches child routes under the project site base', () => {
    render(
      createElement(
        MemoryRouter,
        {
          basename: getBasename('/quiz-dock/'),
          initialEntries: ['/quiz-dock/marks'],
        },
        createElement(
          Routes,
          null,
          createElement(Route, {
            path: '/marks',
            element: createElement('p', null, '標記頁面'),
          }),
        ),
      ),
    )

    expect(screen.getByText('標記頁面')).toBeInTheDocument()
  })
})
