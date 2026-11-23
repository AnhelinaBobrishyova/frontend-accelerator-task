# TASK-001 — Training Sessions Workspace Implementation Plan

## Scope and starting point

The repository is a single React 19 + TypeScript + Vite application. `src/App.tsx`, `src/App.css`, and `src/index.css` still implement the Vite starter screen. There is no application request client, mock mechanism, or test file. The existing npm/Vitest/Testing Library stack is sufficient; no dependency or configuration change is required.

The intended result is one small trainer workspace that loads sessions through a replaceable asynchronous boundary, filters by `Scheduled`, retries a failed initial load, and creates a future `Scheduled` session. Search, multiple filters, persistence, backend work, create-request recovery, and optional detail flows remain out of scope.

## Contracts to establish

Create a small session domain contract shared by the boundary and UI:

- `SessionStatus`: the statuses needed to make filtering observable, with `Scheduled` as the only selectable status and one non-scheduled seed status (for example, `Completed`).
- `Session`: `{ id, title, status, startsAt }`, where `startsAt` is an ISO date-time string at the request boundary.
- `CreateSessionInput`: the trimmed title and ISO start date-time required by creation.
- `SessionsApi`: asynchronous `listSessions()` and `createSession(input)` methods returning promises. `App` receives this interface with the in-memory mock as its default so tests can inject controlled pending, success, and failure outcomes without coupling to seed data.

The form uses a native `datetime-local` value in local browser time. The UI parses that value, rejects an invalid timestamp or a timestamp whose milliseconds are not strictly greater than `Date.now()`, and converts a valid value to ISO before calling the boundary. The successful API result is the source of truth appended to UI state.

## Ordered implementation

### 1. Add the replaceable session request boundary

Create `src/sessionsApi.ts`.

- Define and export the contracts above so both `App` and its behavior test use one data shape.
- Keep mixed fixed seed data private to this module: at least one `Scheduled` session and one session with a different status.
- Implement a default in-memory `sessionsApi` whose list and create methods are asynchronous rather than exposing or mutating seed data from the component.
- Return copies of stored data so consumers cannot mutate the mock store accidentally.
- On create, generate a stable-enough client ID, assign `Scheduled`, append exactly one new item to the in-memory collection, and resolve with that created session.
- Do not add a server, network package, persistence layer, production contract, or request-scenario framework. The `SessionsApi` interface is the replacement seam.

This step is independent of styling, but its exported names and shapes are prerequisites for the component and test.

### 2. Replace the starter component with the complete workspace behavior

Modify `src/App.tsx`.

- Accept an optional `api: SessionsApi` prop that defaults to the module's in-memory implementation.
- On mount, request sessions and expose mutually clear list states: loading, recoverable error, and loaded content. Ignore stale completion after unmount.
- Implement `Retry` by clearing the error, restoring the loading state, and invoking the same list loader again. Do not render a failed load as an empty successful list.
- Render a workspace heading and a semantic list/table-like region in which every session exposes title, status, and a human-readable localized start date/time.
- Add exactly two filter controls, `All` and `Scheduled`. Derive the visible collection from the loaded sessions plus the active filter; do not duplicate filtered data in state or issue another request.
- Add an obvious `Create session` action and a form with labelled title and `datetime-local` controls.
- On submit, trim the title and validate its inclusive 3–80 character range. Validate that the entered local date/time parses and is strictly in the future. Show useful field-level messages and do not call `createSession` while either value is invalid.
- While a valid create request is unresolved, set a pending state, disable the submit control, change its accessible/visible label, and retain a handler guard so repeated submission cannot cross the boundary twice.
- On success, append the single returned session to the canonical session collection, clear the draft, and close the form. Because creation returns `Scheduled`, the item remains visible under either confirmed filter.
- Keep create-request failure recovery outside this minimum implementation. Still restore the pending flag in a `finally` path so the UI cannot remain permanently disabled if the boundary rejects.
- Use semantic controls, associated labels, and an `aria-live` region (or equivalent) for asynchronous status and validation feedback without introducing a component library.

### 3. Replace starter styling with focused workspace styling

Modify `src/App.css`.

- Remove starter-logo, counter, documentation, and social styles.
- Style the workspace header, filter group, session collection, status label, create form, validation messages, loading/error panels, and primary/secondary actions.
- Make pending/disabled controls visually distinct and preserve visible keyboard focus.
- Add a small responsive rule so the form and session metadata remain usable on narrow screens; do not turn this into a broad responsive-design exercise.

Modify `src/index.css`.

- Replace starter-specific global tokens and centered bordered root layout with a small neutral page foundation, readable typography, consistent box sizing, and an app background.
- Keep global rules limited to document/root defaults; component layout remains in `App.css`.

The unused starter image assets may remain in place because deleting them is not required for behavior and would add unrelated churn.

### 4. Add the essential behavior-level test beside the implementation

Create `src/App.test.tsx`.

- Import `@testing-library/jest-dom/vitest` directly in the test so no new Vitest setup file or config edit is necessary.
- Render `App` with a controlled `SessionsApi` test double whose list resolves with mixed statuses and whose create call can be observed.
- Drive the successful creation flow through user-visible controls: wait for the initial sessions, open the form, enter a title containing surrounding whitespace and a deterministic future local date/time, and submit.
- Assert that the boundary receives one call containing the trimmed title and a future ISO timestamp; then assert the returned `Scheduled` session appears in the rendered list without a reload.
- Keep assertions on accessible labels, text, and rendered behavior rather than component state or implementation details.

This single test satisfies the required main-flow coverage. If implementation time permits after it passes, useful non-blocking additions are: mixed-status filtering, load failure followed by successful retry, invalid title/date suppressing requests, and a deferred create promise proving duplicate clicks result in one call. Those additions are risk-based opportunities, not onboarding blockers.

## Verification and evidence

Run the existing repository commands from `/Users/angelinabobriseva/Documents/projects/frontend-accelerator-task` after implementation:

1. `npm test` — the Vitest behavior test passes.
2. `npm run lint` — all added TypeScript/React/test code satisfies the existing ESLint configuration.
3. `npm run build` — TypeScript project build and Vite production build both succeed.
4. `npm run dev` — start the documented application command, then manually observe one actual list, `Scheduled`/`All` filter, and successful create flow in a browser. Record only what was exercised; stop the server afterward.

During the manual check, also confirm that list rows expose title/status/start time, the created session remains visible, and invalid or duplicate submission is not accidentally possible. A manually forced load-error scenario is optional if the controlled automated seam already demonstrates the implementation; do not claim it was observed unless it was actually exercised.

## Risks and rollback

- `datetime-local` has no time-zone offset. Keep conversion at the form boundary and compare parsed local time to the current clock to avoid mixing local input with string comparison.
- React Strict Mode can run mount effects more than once during development. Use effect cleanup/stale-result protection; the mock list method must be safe to call repeatedly.
- Appending both inside the mock store and in React state can create a duplicate only if the UI also reloads immediately after creation. The planned flow appends the one returned result locally and does not re-fetch on success.
- The change is isolated to the new request-boundary/test files and the three starter UI/style files. Rollback consists of reverting those files; no migration, persistent data, feature flag, or backend cleanup is needed.
