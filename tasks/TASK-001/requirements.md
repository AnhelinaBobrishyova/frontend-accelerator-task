# TASK-001 — Training Sessions Workspace Requirements

## Goal

Give a trainer one small workspace in which they can load training sessions, narrow the list by one status, and create a future session that becomes visible in the list. The onboarding outcome is a working, replaceably mocked frontend flow with one behavior-level automated test; it is not a production scheduling system.

## Confirmed facts

### Product behavior

- On opening the workspace, sessions are loaded asynchronously from a mock API/request boundary.
- Each listed session shows its title, status, and start date/time.
- The list provides `All` plus exactly one status filter.
- The single status filter is `Scheduled`, and seed data contains at least one `Scheduled` session and at least one session with a different status so filtering has an observable effect.
- The initial request has a visible loading state and an understandable state from which a user can recover after a request error.
- The load-error state provides a `Retry` action that starts the list request again without requiring a page refresh.
- A user can open a create-session form and enter a title and future date/time.
- A valid title is trimmed and contains 3–80 characters, inclusive.
- A valid session start is strictly in the future.
- Duplicate create submission is prevented while the create request is pending.
- Validation feedback must be useful to the user.
- A successfully created session is added to the visible list.
- A newly created future session receives the `Scheduled` status.
- Mock data must sit behind an HTTP client or equivalent replaceable request boundary; no backend service is part of this task.
- At least one automated behavior-level test must cover filtering or successful creation.
- A later manual check must exercise list, filter, and create once and record what was actually observed. That evidence is outside this requirements artifact.

### Repository context

- The Application Root and Repository Root are `/Users/angelinabobriseva/Documents/projects/frontend-accelerator-task`.
- The application is a single React 19 + TypeScript + Vite project and currently renders the Vite starter screen.
- npm is the existing package manager, evidenced by `package-lock.json`.
- Existing scripts are `npm run dev`, `npm run build`, `npm run lint`, `npm run preview`, and `npm test`.
- The test script runs Vitest in jsdom. React Testing Library, `user-event`, and `jest-dom` are already installed.
- No application test, request client, or mock mechanism is currently present in the inspected source. A conventional frontend mock may therefore be introduced, but its technical choice is not a product requirement.

## Assumptions for a bounded implementation

These remaining assumptions make the criteria below executable but are not confirmed product facts.

- The app interprets the entered date/time and “now” in the user's local browser time zone.
- On successful creation, the create form closes (or otherwise leaves the list unobscured), its draft is cleared, and the created `Scheduled` session is visible under either `All` or `Scheduled`.
- The exercise uses fixed mock data for repeatable development and tests; persistence after a full page reload is not required.

## Acceptance criteria

### AC1 — Load and render sessions

Given the workspace is opened and the list request is unresolved, a visible loading message or indicator is shown. When the request succeeds, the loading state is removed and every returned session is represented in the list with a title, status, and human-readable start date/time.

### AC2 — Filter by one status

Given loaded data contains both `Scheduled` and non-`Scheduled` sessions, the filter exposes only `All` and `Scheduled`. Selecting `Scheduled` shows only sessions whose status is `Scheduled`; selecting `All` restores all loaded sessions. Filtering is local to the loaded list and does not require another backend service.

### AC3 — Recover from an initial list-request error

When the list request fails, the loading state ends and the workspace shows an understandable error message plus a `Retry` action. Activating `Retry` starts a new list request, returns to a visible pending state, and, if that request succeeds, replaces the error with the sessions list. A failed request must not be presented as a successful empty list.

### AC4 — Open and use the create form

The workspace provides an obvious create-session action. Activating it reveals a form with controls for title and start date/time plus a submit action, without requiring navigation to an out-of-scope details page.

### AC5 — Validate title

On attempted submission, leading and trailing whitespace is ignored when validating the title. A trimmed title shorter than 3 characters or longer than 80 characters is rejected with a message that identifies the 3–80 character requirement, and no create request is sent. Titles of exactly 3 and 80 trimmed characters are accepted when all other fields are valid. The stored/displayed title uses the trimmed value.

### AC6 — Validate future date/time

On attempted submission, a missing, invalid, past, or exactly-current date/time is rejected with a message explaining that the start must be in the future, and no create request is sent. A valid date/time strictly later than the current local time passes this validation.

### AC7 — Prevent duplicate pending submissions

Given valid input and an unresolved create request, the submit action indicates or exposes a pending state and cannot initiate another create request. Repeated activation while pending results in exactly one create request and one created list item.

### AC8 — Show a successful creation in the active workspace

When a valid create request succeeds, one session with the trimmed title, selected future start, and `Scheduled` status is added to the current client-side collection. The newly created session is immediately visible in the list without a page reload, including when `Scheduled` is the active filter. A success must not duplicate the item.

### AC9 — Keep mock data replaceable

Both list loading and session creation cross an asynchronous request boundary that the UI consumes rather than reading or mutating inline seed data directly. The boundary supports pending, success, and failure outcomes needed by AC1, AC3, AC7, and AC8. Replacing the mock implementation must not require rewriting the list, filter, or form behavior. No deployable server, database, authentication, or production API contract is created.

### AC10 — Behavior-level automated test

At least one Vitest + jsdom test drives the rendered UI through user-observable behavior rather than asserting component internals. The minimum required test may cover either:

- filtering: resolve the mocked list request with mixed statuses, select `Scheduled`, and assert that matching sessions remain while nonmatching sessions do not; or
- successful creation: resolve the initial list, open the form, enter a valid title and future date/time, submit, resolve the mocked create request, and assert that the new session is visible.

The selected test passes through the repository's existing `npm test` script. Broader coverage is optional.

## Constraints

- Stay within the existing React, TypeScript, Vite, npm, and Vitest setup.
- Preserve existing repository scripts and avoid unrelated source or configuration rewrites.
- Keep all data mocked behind a replaceable request boundary and do not implement a backend.
- Use only the smallest data shape needed to render a session and complete creation: identity as needed by the UI, title, status, and start date/time.
- Keep error handling to the one required recoverable list-request state. Additional failure matrices are optional and must not delay the onboarding flow.
- Report later build, test, or browser results only when those checks were actually run.

## Non-goals

- Session details, drawers, edit/delete actions, or deep links.
- Search, multiple status filters, sorting, pagination, or advanced empty-state scenarios.
- Authentication, authorization, role/permission behavior, or multi-user synchronization.
- A backend, database, persistence across reloads, production API contract, or exhaustive request scenario matrix.
- Responsive screenshot sets, exhaustive accessibility validation, localization, time-zone selection, or visual design-system work.
- Full test coverage, CI, deployment, a public URL, strict-TypeScript migration, architecture refactoring, or unrelated cleanup.

## Open questions

1. Should a create-request failure receive user-facing recovery behavior? The task explicitly requires a recoverable request error for the sessions list but does not require a separate create-error scenario, so it is excluded from the minimum scope.

## Readiness

The required onboarding behavior is sufficiently bounded and independently verifiable. With `Scheduled` and `Retry` confirmed, the required scope is ready. The remaining create-request failure question is explicitly outside the minimum onboarding scope and does not block readiness. No production code or implementation plan was created as part of this artifact.
