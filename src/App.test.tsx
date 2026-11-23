import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import type { Session, SessionsApi } from './sessionsApi'

afterEach(cleanup)

const mixedSessions: Session[] = [
  {
    id: 'scheduled-1',
    title: 'Advanced Facilitation',
    status: 'Scheduled',
    startsAt: '2027-01-14T09:30:00.000Z',
  },
  {
    id: 'completed-1',
    title: 'Coaching Fundamentals',
    status: 'Completed',
    startsAt: '2026-10-08T13:00:00.000Z',
  },
]

function createApi(overrides: Partial<SessionsApi> = {}): SessionsApi {
  return {
    listSessions: vi.fn().mockResolvedValue(mixedSessions),
    createSession: vi.fn(),
    ...overrides,
  }
}

describe('Training Sessions workspace', () => {
  it('creates a trimmed future session and shows it in the list', async () => {
    const user = userEvent.setup()
    const createdSession: Session = {
      id: 'new-session',
      title: 'Leadership Lab',
      status: 'Scheduled',
      startsAt: '2099-06-18T12:30:00.000Z',
    }
    const createSession = vi.fn().mockResolvedValue(createdSession)
    const api = createApi({ createSession })

    render(<App api={api} />)

    expect(await screen.findByText('Advanced Facilitation')).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Create Session' }))
    await user.type(
      screen.getByRole('textbox', { name: 'Session title' }),
      '  Leadership Lab  ',
    )
    await user.type(
      screen.getByLabelText('Start date & time'),
      '2099-06-18T12:30',
    )
    await user.click(
      within(screen.getByRole('form', { name: 'Add to the Schedule' })).getByRole(
        'button',
        { name: 'Create Session' },
      ),
    )

    await waitFor(() => {
      expect(createSession).toHaveBeenCalledTimes(1)
    })
    expect(createSession).toHaveBeenCalledWith({
      title: 'Leadership Lab',
      startsAt: expect.stringMatching(/^2099-06-18T/),
    })
    expect(await screen.findByText('Leadership Lab')).toBeVisible()
  })

  it('filters the loaded sessions to Scheduled', async () => {
    const user = userEvent.setup()

    render(<App api={createApi()} />)

    expect(await screen.findByText('Coaching Fundamentals')).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Scheduled' }))

    expect(screen.getByText('Advanced Facilitation')).toBeVisible()
    expect(screen.queryByText('Coaching Fundamentals')).not.toBeInTheDocument()
  })

  it('retries after an initial load error', async () => {
    const user = userEvent.setup()
    const listSessions = vi
      .fn()
      .mockRejectedValueOnce(new Error('Request failed'))
      .mockResolvedValueOnce(mixedSessions)

    render(<App api={createApi({ listSessions })} />)

    expect(await screen.findByText('Sessions couldn’t load')).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Retry' }))

    expect(await screen.findByText('Advanced Facilitation')).toBeVisible()
    expect(listSessions).toHaveBeenCalledTimes(2)
  })

  it('does not allow creation before the initial sessions load completes', async () => {
    const user = userEvent.setup()
    let resolveList: ((sessions: Session[]) => void) | undefined
    const listSessions = vi.fn(
      () =>
        new Promise<Session[]>((resolve) => {
          resolveList = resolve
        }),
    )
    const createSession = vi.fn()

    render(<App api={createApi({ listSessions, createSession })} />)

    const createButton = screen.getByRole('button', { name: 'Create Session' })
    expect(createButton).toBeDisabled()
    await user.click(createButton)
    expect(screen.queryByRole('form')).not.toBeInTheDocument()
    expect(createSession).not.toHaveBeenCalled()

    resolveList?.(mixedSessions)

    await waitFor(() => {
      expect(createButton).toBeEnabled()
    })
  })

  it('prevents a second create while the first request is pending', async () => {
    const user = userEvent.setup()
    let resolveCreate: ((session: Session) => void) | undefined
    const createSession = vi.fn(
      () =>
        new Promise<Session>((resolve) => {
          resolveCreate = resolve
        }),
    )

    render(<App api={createApi({ createSession })} />)

    await screen.findByText('Advanced Facilitation')
    await user.click(screen.getByRole('button', { name: 'Create Session' }))
    await user.type(
      screen.getByRole('textbox', { name: 'Session title' }),
      'Pending Session',
    )
    await user.type(
      screen.getByLabelText('Start date & time'),
      '2099-06-18T12:30',
    )
    await user.click(
      within(screen.getByRole('form', { name: 'Add to the Schedule' })).getByRole(
        'button',
        { name: 'Create Session' },
      ),
    )

    const pendingButton = screen.getByRole('button', { name: 'Creating…' })
    expect(pendingButton).toBeDisabled()
    await user.click(pendingButton)
    expect(createSession).toHaveBeenCalledTimes(1)

    resolveCreate?.({
      id: 'pending-session',
      title: 'Pending Session',
      status: 'Scheduled',
      startsAt: '2099-06-18T12:30:00.000Z',
    })

    expect(await screen.findByText('Pending Session')).toBeVisible()
  })
})
