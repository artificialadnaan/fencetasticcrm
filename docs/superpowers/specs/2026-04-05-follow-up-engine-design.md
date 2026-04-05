# Fencetastic Follow-Up Engine Design

## Goal

Build a CRM-native estimate follow-up engine that automatically creates reminder tasks and email drafts on a fixed cadence of 1, 3, 7, and 14 calendar days after an estimate, uses Zoho Mail as the outbound and inbound channel, and requires explicit user closure as `won`, `lost`, or `closed`.

## Scope

This feature covers:

- automatic follow-up sequence creation for estimate-stage projects
- task generation for day 1, 3, 7, and 14 follow-ups
- draft email generation for each scheduled touch
- manual send flow after in-CRM review
- inbound Zoho reply detection
- creation of response tasks when a customer replies
- explicit sequence closure with outcome tracking
- lost-reason capture with both structured code and free-text notes
- dashboard/calendar/project-detail surfacing of follow-up work

This feature does not cover:

- fully automatic outbound sending
- auto-closing a sequence based only on inbox activity
- advanced branching cadences beyond 1/3/7/14
- AI-written reply analysis beyond user-authored summaries

## Product Decisions

### Reminder Cadence

When a project enters `ESTIMATE`, the CRM creates a follow-up sequence with reminders due on:

- day 1
- day 3
- day 7
- day 14

These are calendar days, not business days.

### Send Model

The CRM creates the reminder and the draft email, but a user must review the email and manually hit send. There is no automatic outbound send.

### Reply Handling

If a customer replies in Zoho Mail:

- the existing estimate sequence remains active
- the CRM creates a new `CUSTOMER_REPLY` task reminding the rep to review and respond
- the sequence is only stopped when a user explicitly marks it `won`, `lost`, or `closed`

### Close Outcomes

Valid follow-up sequence outcomes:

- `ACTIVE`
- `WON`
- `LOST`
- `CLOSED`

If the user marks the estimate `LOST`, they must provide:

- a structured lost-reason code
- a free-text explanation

Approved lost-reason list:

- `PRICE`
- `NO_RESPONSE`
- `CHOSE_COMPETITOR`
- `TIMING`
- `FINANCING`
- `SCOPE_MISMATCH`
- `DUPLICATE_BAD_LEAD`
- `OTHER`

## Architecture

The CRM remains the system of record for follow-up state. Zoho Mail is a transport and signal source only.

High-level flow:

1. Project enters `ESTIMATE`
2. CRM creates estimate follow-up sequence
3. CRM creates scheduled follow-up tasks for day 1/3/7/14
4. CRM generates email drafts for each scheduled task
5. User reviews and manually sends through Zoho Mail
6. Zoho reply sync detects customer response
7. CRM creates a `CUSTOMER_REPLY` task and stores reply metadata
8. User records summary and eventually closes sequence as `WON`, `LOST`, or `CLOSED`

This keeps business state inside the app while allowing mailbox-driven operational reminders.

## Data Model

Add dedicated follow-up entities instead of relying on the single existing `followUpDate` field.

### EstimateFollowUpSequence

Purpose: one sequence per estimate-stage pursuit.

Fields:

- `id`
- `projectId`
- `status`: `ACTIVE | WON | LOST | CLOSED`
- `startedAt`
- `closedAt`
- `closedReason`
- `lostReasonCode`
- `lostReasonNotes`
- `lastCustomerResponseAt`
- `lastCustomerResponseSummary`
- `zohoThreadId` or equivalent mailbox conversation reference if available
- `createdAt`
- `updatedAt`

Rules:

- one active sequence per project at a time
- sequence is created when project enters `ESTIMATE`
- sequence stops generating work after closure

### EstimateFollowUpTask

Purpose: one actionable reminder/response item within a sequence.

Fields:

- `id`
- `sequenceId`
- `projectId`
- `kind`: `DAY_1 | DAY_3 | DAY_7 | DAY_14 | CUSTOMER_REPLY`
- `dueDate`
- `status`: `PENDING | COMPLETED | SKIPPED`
- `draftSubject`
- `draftBody`
- `sentAt`
- `completedAt`
- `completedByUserId`
- `customerResponseAt`
- `customerResponseSummary`
- `notes`
- `createdAt`
- `updatedAt`

Rules:

- scheduled tasks are created from estimate date
- reply tasks are created from inbound customer mail events
- completed and skipped tasks stay in the timeline for auditability

## Lifecycle Rules

### Sequence Creation

When a project is created in `ESTIMATE` or moved into `ESTIMATE`:

- ensure `estimateDate` exists
- create a new active follow-up sequence if one does not already exist
- create the day 1/3/7/14 tasks based on `estimateDate`

### Sequence Continuity

If a customer replies:

- do not cancel existing future tasks automatically
- create a `CUSTOMER_REPLY` task for rep review/action
- allow the user to decide whether to continue working the sequence or close it

### Closure

When a user marks the project/sequence:

- `WON`: close sequence and stop future reminders
- `LOST`: require lost reason code and note, then close sequence and stop future reminders
- `CLOSED`: close sequence and stop future reminders without classifying as won/lost

Closing a sequence should also mark any future pending tasks as `SKIPPED`.

## Zoho Mail Integration

### Outbound

Use Zoho Mail OAuth and official Mail API for sending from the connected mailbox.

The CRM send flow:

- rep opens a pending follow-up task
- CRM shows generated draft subject/body
- rep edits if needed
- rep clicks send
- CRM sends through Zoho Mail API
- task records `sentAt`

### Inbound

The CRM should periodically sync or receive reply signals from Zoho Mail and associate replies to the matching follow-up sequence using thread/message references when possible, with fallback matching by mailbox metadata.

When a reply is detected:

- update sequence `lastCustomerResponseAt`
- require/store `lastCustomerResponseSummary` from a user-facing workflow
- create a `CUSTOMER_REPLY` task

The app should not auto-decide business outcome from mailbox activity alone.

## UI

### Project Detail

Add a dedicated follow-up section on the project detail page.

It should show:

- current follow-up sequence status
- next pending follow-up task
- full follow-up timeline
- latest customer response summary
- draft/send state for each task
- explicit close controls for `won`, `lost`, and `closed`
- required lost reason fields when closing as lost

This is the primary workspace for follow-up management.

### Dashboard

Switch dashboard follow-up widgets to use pending follow-up tasks rather than the legacy single `followUpDate` field.

The dashboard should surface:

- due follow-up tasks
- overdue follow-up tasks
- customer-reply tasks awaiting action

### Calendar

Show follow-up tasks and customer-reply tasks in the calendar so reps can see estimate outreach alongside installs and other events.

## Draft Generation

Each scheduled task should be pre-populated with a draft email. Draft generation can start as simple templated content with project/customer interpolation.

Minimum template data:

- customer name
- project description
- company/sender identity
- prior estimate context

The send flow should allow the user to edit subject/body before sending.

## Reporting

The engine should support later reporting on:

- follow-up completion rate
- response rate by touch number
- win/loss by lost reason
- time from estimate to close
- estimates with no response after full sequence

For this reason, structured status, lost reason, and task history must be stored explicitly.

## Backward Compatibility

The existing `followUpDate` field should not remain the primary engine for estimate reminders. It can be preserved for compatibility during rollout, but redesigned dashboard/calendar behavior should move to the task model.

If migration is needed:

- existing estimate/open projects with a manual `followUpDate` may need a compatibility path
- existing project detail editing should not silently destroy new sequence/task data

## Risks

### Duplicate Reminder Creation

If estimate entry logic runs more than once, duplicate sequences/tasks could be created. Mitigation: enforce one active sequence per project and idempotent task generation.

### Mail Thread Matching

Reply detection may be imperfect if thread references are missing or changed. Mitigation: store Zoho message/thread identifiers wherever available and keep human review in the loop.

### Workflow Drift

If users can close projects without closing sequences, task state can become stale. Mitigation: tie project outcome/status changes and follow-up closure rules together explicitly.

## Testing Requirements

Implementation must cover:

- sequence creation on estimate entry
- exact due dates for day 1/3/7/14
- reply task creation on inbound response
- sequence closure behavior for won/lost/closed
- required lost reason validation
- dashboard follow-up sourcing from tasks
- calendar follow-up task visibility
- manual send flow state updates
- duplicate-protection/idempotency

## Success Criteria

The feature is successful when:

- every estimate automatically gets a 1/3/7/14 follow-up sequence
- users see reminders without manually setting `followUpDate`
- users review drafts before sending
- Zoho replies create response work automatically
- sequences only stop on explicit `won`, `lost`, or `closed`
- lost outcomes always include a reason and notes
- dashboard and calendar reflect the new follow-up engine correctly
