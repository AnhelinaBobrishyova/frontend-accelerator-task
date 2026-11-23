import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import {
  sessionsApi,
  type Session,
  type SessionsApi,
  type SessionStatus,
} from './sessionsApi'

type AppProps = {
  api?: SessionsApi
}

type LoadState = 'loading' | 'loaded' | 'error'
type SessionFilter = 'All' | Extract<SessionStatus, 'Scheduled'>

type FormErrors = {
  title?: string
  startsAt?: string
}

const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
})

function App({ api = sessionsApi }: AppProps) {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [activeFilter, setActiveFilter] = useState<SessionFilter>('All')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [startsAt, setStartsAt] = useState('')
  const [formErrors, setFormErrors] = useState<FormErrors>({})
  const [isCreating, setIsCreating] = useState(false)
  const loadRequestId = useRef(0)
  const isCreatePending = useRef(false)
  const titleInputRef = useRef<HTMLInputElement>(null)
  const startsAtInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const requestId = loadRequestId.current + 1
    loadRequestId.current = requestId

    void api
      .listSessions()
      .then((loadedSessions) => {
        if (loadRequestId.current !== requestId) {
          return
        }

        setSessions(loadedSessions)
        setLoadState('loaded')
      })
      .catch(() => {
        if (loadRequestId.current === requestId) {
          setLoadState('error')
        }
      })

    return () => {
      loadRequestId.current += 1
    }
  }, [api])

  const retryLoad = () => {
    const requestId = loadRequestId.current + 1
    loadRequestId.current = requestId
    setLoadState('loading')

    void api
      .listSessions()
      .then((loadedSessions) => {
        if (loadRequestId.current !== requestId) {
          return
        }

        setSessions(loadedSessions)
        setLoadState('loaded')
      })
      .catch(() => {
        if (loadRequestId.current === requestId) {
          setLoadState('error')
        }
      })
  }

  const visibleSessions = useMemo(() => {
    if (activeFilter === 'All') {
      return sessions
    }

    return sessions.filter((session) => session.status === activeFilter)
  }, [activeFilter, sessions])

  const closeForm = () => {
    if (isCreatePending.current) {
      return
    }

    setIsFormOpen(false)
    setTitle('')
    setStartsAt('')
    setFormErrors({})
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (isCreatePending.current) {
      return
    }

    const trimmedTitle = title.trim()
    const parsedStartsAt = new Date(startsAt)
    const errors: FormErrors = {}

    if (trimmedTitle.length < 3 || trimmedTitle.length > 80) {
      errors.title = 'Title must contain between 3 and 80 characters.'
    }

    if (
      startsAt === '' ||
      Number.isNaN(parsedStartsAt.getTime()) ||
      parsedStartsAt.getTime() <= Date.now()
    ) {
      errors.startsAt = 'Choose a date and time in the future.'
    }

    setFormErrors(errors)

    if (errors.title !== undefined) {
      titleInputRef.current?.focus()
      return
    }

    if (errors.startsAt !== undefined) {
      startsAtInputRef.current?.focus()
      return
    }

    isCreatePending.current = true
    setIsCreating(true)

    try {
      const createdSession = await api.createSession({
        title: trimmedTitle,
        startsAt: parsedStartsAt.toISOString(),
      })

      setSessions((currentSessions) => [...currentSessions, createdSession])
      setTitle('')
      setStartsAt('')
      setFormErrors({})
      setIsFormOpen(false)
    } catch {
      // Create-request error recovery is outside the minimum onboarding scope.
    } finally {
      isCreatePending.current = false
      setIsCreating(false)
    }
  }

  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to workspace
      </a>
      <main id="main-content" className="workspace">
        <header className="workspace-header">
          <div>
            <p className="eyebrow">Trainer workspace</p>
            <h1>Training Sessions</h1>
            <p className="intro">
              Plan upcoming sessions and keep your training calendar in view.
            </p>
          </div>
          <button
            className="button button-primary"
            type="button"
            onClick={() => setIsFormOpen(true)}
            disabled={isFormOpen || loadState !== 'loaded'}
          >
            Create Session
          </button>
        </header>

        {isFormOpen ? (
          <section className="create-panel" aria-labelledby="create-heading">
            <div className="section-heading">
              <div>
                <p className="section-kicker">New session</p>
                <h2 id="create-heading">Add to the Schedule</h2>
              </div>
              <button
                className="button button-quiet"
                type="button"
                onClick={closeForm}
                disabled={isCreating}
              >
                Cancel
              </button>
            </div>

            <form
              className="create-form"
              aria-labelledby="create-heading"
              onSubmit={handleSubmit}
              noValidate
            >
              <div className="field">
                <label htmlFor="session-title">Session title</label>
                <input
                  ref={titleInputRef}
                  id="session-title"
                  name="sessionTitle"
                  type="text"
                  autoComplete="off"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  aria-invalid={formErrors.title !== undefined}
                  aria-describedby={
                    formErrors.title !== undefined ? 'title-error' : undefined
                  }
                  placeholder="e.g. Coaching for New Managers…"
                />
                {formErrors.title !== undefined ? (
                  <p id="title-error" className="field-error">
                    {formErrors.title}
                  </p>
                ) : null}
              </div>

              <div className="field">
                <label htmlFor="session-start">Start date & time</label>
                <input
                  ref={startsAtInputRef}
                  id="session-start"
                  name="sessionStart"
                  type="datetime-local"
                  autoComplete="off"
                  value={startsAt}
                  onChange={(event) => setStartsAt(event.target.value)}
                  aria-invalid={formErrors.startsAt !== undefined}
                  aria-describedby={
                    formErrors.startsAt !== undefined
                      ? 'starts-at-error'
                      : undefined
                  }
                />
                {formErrors.startsAt !== undefined ? (
                  <p id="starts-at-error" className="field-error">
                    {formErrors.startsAt}
                  </p>
                ) : null}
              </div>

              <div className="form-actions" aria-live="polite">
                <button
                  className="button button-primary"
                  type="submit"
                  disabled={isCreating}
                >
                  {isCreating ? 'Creating…' : 'Create Session'}
                </button>
              </div>
            </form>
          </section>
        ) : null}

        <section className="sessions-panel" aria-labelledby="sessions-heading">
          <div className="section-heading sessions-heading-row">
            <div>
              <p className="section-kicker">Overview</p>
              <h2 id="sessions-heading">Your Sessions</h2>
            </div>
            <div className="filter-group" aria-label="Filter sessions">
              {(['All', 'Scheduled'] as const).map((filter) => (
                <button
                  key={filter}
                  className="filter-button"
                  type="button"
                  aria-pressed={activeFilter === filter}
                  onClick={() => setActiveFilter(filter)}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          <div className="session-content" aria-live="polite">
            {loadState === 'loading' ? (
              <div className="state-panel">
                <span className="loading-dot" aria-hidden="true" />
                <p>Loading sessions…</p>
              </div>
            ) : null}

            {loadState === 'error' ? (
              <div className="state-panel state-panel-error" role="alert">
                <div>
                  <h3>Sessions couldn’t load</h3>
                  <p>Check the request and try again.</p>
                </div>
                <button
                  className="button button-secondary"
                  type="button"
                  onClick={retryLoad}
                >
                  Retry
                </button>
              </div>
            ) : null}

            {loadState === 'loaded' ? (
              visibleSessions.length > 0 ? (
                <ul className="session-list">
                  {visibleSessions.map((session) => (
                    <li className="session-card" key={session.id}>
                      <div className="session-title-group">
                        <span
                          className={`status-dot status-${session.status.toLowerCase()}`}
                          aria-hidden="true"
                        />
                        <div className="session-copy">
                          <h3>{session.title}</h3>
                          <p>{dateTimeFormatter.format(new Date(session.startsAt))}</p>
                        </div>
                      </div>
                      <span
                        className={`status-badge status-badge-${session.status.toLowerCase()}`}
                      >
                        {session.status}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="state-panel">
                  <p>No sessions match this filter.</p>
                </div>
              )
            ) : null}
          </div>
        </section>
      </main>
    </>
  )
}

export default App
