export type SessionStatus = 'Scheduled' | 'Completed'

export type Session = {
  id: string
  title: string
  status: SessionStatus
  startsAt: string
}

export type CreateSessionInput = {
  title: string
  startsAt: string
}

export type SessionsApi = {
  listSessions: () => Promise<Session[]>
  createSession: (input: CreateSessionInput) => Promise<Session>
}

const requestDelay = 450

const waitForRequest = () =>
  new Promise<void>((resolve) => {
    window.setTimeout(resolve, requestDelay)
  })

let nextSessionId = 3
let storedSessions: Session[] = [
  {
    id: 'session-1',
    title: 'Advanced Facilitation',
    status: 'Scheduled',
    startsAt: '2027-01-14T09:30:00.000Z',
  },
  {
    id: 'session-2',
    title: 'Coaching Fundamentals',
    status: 'Completed',
    startsAt: '2026-10-08T13:00:00.000Z',
  },
]

export const sessionsApi: SessionsApi = {
  async listSessions() {
    await waitForRequest()
    return storedSessions.map((session) => ({ ...session }))
  },

  async createSession(input) {
    await waitForRequest()

    const createdSession: Session = {
      id: `session-${nextSessionId}`,
      title: input.title,
      status: 'Scheduled',
      startsAt: input.startsAt,
    }

    nextSessionId += 1
    storedSessions = [...storedSessions, createdSession]

    return { ...createdSession }
  },
}
