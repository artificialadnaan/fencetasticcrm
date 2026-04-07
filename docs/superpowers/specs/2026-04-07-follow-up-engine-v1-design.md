# Fencetastic Follow-Up Engine V1 Design

## Goal

Build a CRM-native estimate follow-up engine that creates scheduled follow-up tasks on a fixed 1/3/7/14-day cadence, stores editable draft content for each touch, and requires explicit user closure as `WON`, `LOST`, or `CLOSED`.

This v1 intentionally excludes Zoho Mail and any other email transport or inbox sync. The CRM owns sequence state and task state entirely in this phase.

## Scope

This feature includes:

- automatic follow-up sequence creation for estimate-stage projects
- automatic creation of day 1, 3, 7, and 14 follow-up tasks
- editable draft subject/body stored on each scheduled task
- explicit sequence closure with outcome tracking
- required lost-reason capture for `LOST`
- project-detail follow-up management UI
- dashboard surfacing of due and overdue follow-up work
- calendar surfacing of scheduled follow-up tasks
- API and shared types for sequence/task reads and updates

This feature does not include:

- Zoho Mail OAuth, sending, inbox sync, or reply detection
- automatic outbound sending
- generic CRM-wide task infrastructure
- auto-closing a sequence based on any external signal
- AI-authored message generation beyond deterministic templates

## Product Decisions

### Reminder Cadence

When a project enters `ESTIMATE`, the CRM creates a follow-up sequence anchored to `estimateDate`.

The sequence creates scheduled follow-up tasks due on:

- day 1
- day 3
- day 7
- day 14

These are calendar days, not business days.

### Sequence Ownership

The follow-up engine is estimate-specific. It is not a generic task system.

Each estimate pursuit has at most one active follow-up sequence. If a project leaves `ESTIMATE` and later re-enters `ESTIMATE`, the system may create a new sequence only if there is no active sequence and the prior one is already closed.

### Draft Model

Each scheduled task stores:

- `draftSubject`
- `draftBody`

The initial content is generated from deterministic templates using project/customer context. Users may edit draft content in the CRM. In v1, draft storage is operational only; there is no send pipeline.

### Close Outcomes

Valid sequence statuses:

- `ACTIVE`
- `WON`
- `LOST`
- `CLOSED`

Closing rules:

- `WON` closes the sequence and skips future pending tasks
- `LOST` requires a lost-reason code and free-text note, then closes the sequence and skips future pending tasks
- `CLOSED` closes the sequence without classifying as won/lost and skips future pending tasks

In v1, sequence closure does not introduce new project-level statuses. `WON`, `LOST`, and `CLOSED` are follow-up sequence outcomes only.

Project-status handling in v1:

- closing a sequence as `WON` does not automatically mutate `Project.status`
- closing a sequence as `LOST` does not automatically mutate `Project.status`
- closing a sequence as `CLOSED` does not automatically mutate `Project.status`

Users may still change `Project.status` separately through the existing project workflows. This keeps the first release compatible with the current `ProjectStatus` enum and avoids mixing estimate follow-up outcomes with broader project lifecycle state.

Approved lost-reason codes:

- `PRICE`
- `NO_RESPONSE`
- `CHOSE_COMPETITOR`
- `TIMING`
- `FINANCING`
- `SCOPE_MISMATCH`
- `DUPLICATE_BAD_LEAD`
- `OTHER`

## Existing System Constraints

The current codebase still uses the single `Project.followUpDate` field in two places:

- dashboard follow-up widgets in [`apps/api/src/services/dashboard.service.ts`](/Users/adnaaniqbal/Developer/FencetasticMaster/FencetasticCRM/apps/api/src/services/dashboard.service.ts)
- derived follow-up calendar events in [`apps/api/src/services/calendar.service.ts`](/Users/adnaaniqbal/Developer/FencetasticMaster/FencetasticCRM/apps/api/src/services/calendar.service.ts)

The current project detail page in [`apps/web/src/pages/project-detail.tsx`](/Users/adnaaniqbal/Developer/FencetasticMaster/FencetasticCRM/apps/web/src/pages/project-detail.tsx) has no dedicated follow-up surface today.

V1 replaces those read paths with sequence/task-backed data while leaving `Project.followUpDate` in the schema for backward compatibility and safe rollout. New follow-up behavior must not depend on `followUpDate`.

## Architecture

The CRM remains the system of record for follow-up state.

High-level flow:

1. Project is created in `ESTIMATE` or transitions into `ESTIMATE`
2. API ensures `estimateDate` exists
3. API creates one active follow-up sequence for the project if none exists
4. API generates day 1/3/7/14 follow-up tasks with draft content
5. Users view and manage follow-up state from project detail
6. Dashboard and calendar read from pending follow-up tasks
7. User closes the sequence as `WON`, `LOST`, or `CLOSED`
8. API marks future pending tasks `SKIPPED`

This keeps the implementation narrow, observable, and compatible with later mail integration.

## Data Model

### EstimateFollowUpSequence

Purpose: one lifecycle container for an estimate follow-up effort.

Fields:

- `id`
- `projectId`
- `status`: `ACTIVE | WON | LOST | CLOSED`
- `startedAt`
- `closedAt`
- `closedSummary`
- `lostReasonCode`
- `lostReasonNotes`
- `createdAt`
- `updatedAt`

Rules:

- one active sequence per project at a time
- sequence is created when a project enters `ESTIMATE`
- sequence owns all scheduled follow-up tasks
- closed sequences are immutable except for read access
- active-sequence uniqueness must be enforced inside a transaction at the service layer because the current stack does not have a partial unique database constraint modeled for "one active row per project"
- `closedSummary` is an optional free-text user note about why the sequence was closed; it does not duplicate the enum status

### EstimateFollowUpTask

Purpose: one actionable follow-up item within a sequence.

Fields:

- `id`
- `sequenceId`
- `projectId`
- `kind`: `DAY_1 | DAY_3 | DAY_7 | DAY_14`
- `dueDate`
- `status`: `PENDING | COMPLETED | SKIPPED`
- `draftSubject`
- `draftBody`
- `completedAt`
- `completedByUserId`
- `notes`
- `createdAt`
- `updatedAt`

Rules:

- scheduled tasks are created from `estimateDate`
- each sequence always has exactly four scheduled tasks
- completed and skipped tasks remain in history
- v1 has no `CUSTOMER_REPLY` task because inbox integration is out of scope

### Enums

Add shared enums for:

- `EstimateFollowUpSequenceStatus`
- `EstimateFollowUpTaskKind`
- `EstimateFollowUpTaskStatus`
- `EstimateFollowUpLostReasonCode`

## Lifecycle Rules

### Sequence Creation

Trigger creation when:

- a project is created with status `ESTIMATE`
- a project status changes from any non-`ESTIMATE` value to `ESTIMATE`

Creation steps:

1. if `estimateDate` is missing, default it to today
2. check whether an active sequence already exists
3. if not, create one active sequence
4. create day 1/3/7/14 tasks based on `estimateDate`

### Sequence Stability

Once a sequence exists:

- updating unrelated project fields must not regenerate tasks
- returning a project to `ESTIMATE` while an active sequence exists must not duplicate tasks
- editing `estimateDate` after sequence creation does not automatically rewrite existing task due dates in v1

This avoids hidden destructive behavior and keeps the first release predictable.

### Task Completion

Users can mark a scheduled task complete after they perform the follow-up action outside or alongside the CRM.

Completing a task records:

- `status = COMPLETED`
- `completedAt`
- `completedByUserId`
- any optional note or draft edits already stored on the task

### Closure

When a user closes a sequence:

- set sequence status and close metadata
- mark all future pending tasks `SKIPPED`
- preserve completed tasks as-is

`LOST` requires both:

- `lostReasonCode`
- `lostReasonNotes`

## Draft Generation

Draft content starts as templated copy using:

- customer name
- project description
- company identity
- estimate date context

V1 templates should be deterministic and server-generated so every new task has usable starter content. Users may edit subject and body at any time before marking the task complete.

## API Design

Add dedicated follow-up routes rather than overloading unrelated project endpoints.

Required capabilities:

- fetch follow-up summary for a project
- list all follow-up tasks for a project sequence
- update task draft subject/body/notes
- mark a task complete
- close a sequence as `WON`, `LOST`, or `CLOSED`

Project create/update services remain responsible for sequence creation triggers when entering `ESTIMATE`.

Dashboard and calendar APIs should read from follow-up tasks rather than `Project.followUpDate`.

## UI

### Project Detail

Project detail becomes the primary follow-up workspace.

Add a dedicated follow-up section or tab showing:

- current sequence status
- estimate date anchor
- next pending follow-up task
- all scheduled tasks in order
- editable draft subject/body for each task
- task notes
- complete-task controls
- close controls for `WON`, `LOST`, and `CLOSED`
- required lost-reason fields when closing as `LOST`

### Dashboard

Replace the legacy follow-up widget source with pending follow-up tasks.

The dashboard should surface:

- tasks due today
- overdue tasks
- project/customer context for each pending task

This keeps the existing panel useful while moving it onto the new engine.

### Calendar

Replace legacy follow-up date events with follow-up task events.

Calendar should show each pending scheduled task as a follow-up event on its due date. Clicking a derived follow-up task event should route to the related project detail view.

### Legacy Field Handling

`Project.followUpDate` remains in the database for now but is no longer the canonical source for dashboard or calendar follow-up visibility.

V1 should remove or replace user-facing single-date follow-up editing on the primary estimate management surfaces touched by this feature:

- remove the legacy editable `followUpDate` control from the project detail follow-up workflow
- remove the legacy `followUpDate` input from the create-project dialog

This prevents the user from seeing two competing follow-up models at once.

`Project.followUpDate` may still be populated internally for transitional compatibility if needed, but:

- it must not drive business logic
- it must not drive dashboard or calendar follow-up visibility
- it should not be presented as the primary follow-up control in v1

## Error Handling

The system should reject:

- closing a sequence as `LOST` without required lost-reason fields
- task updates for tasks belonging to closed sequences when the action would mutate immutable sequence state
- duplicate active sequence creation for the same project
- task completion against nonexistent project/sequence/task relationships

If sequence creation fails during project creation or transition into `ESTIMATE`, the enclosing project mutation should fail rather than leaving the project half-configured.

## Testing Strategy

### API / Service Tests

Add tests for:

- sequence creation on project create in `ESTIMATE`
- sequence creation on project status transition into `ESTIMATE`
- no duplicate sequence when re-saving an estimate with an active sequence
- correct day 1/3/7/14 task generation from `estimateDate`
- close-as-lost validation
- close behavior skipping future tasks
- dashboard follow-up queries reading pending tasks
- calendar follow-up events reading pending tasks

### Web Verification

Add UI tests for:

- project detail follow-up rendering
- lost-close validation
- task draft editing
- dashboard follow-up panel rendering from live task data

Manual verification should confirm:

- estimate project creation creates sequence/task state
- project detail can complete tasks and close sequences
- dashboard updates due/overdue task visibility
- calendar shows pending follow-up tasks on due dates

## Future Work

Deferred to later phases:

- Zoho Mail send flow
- Zoho reply sync and customer-reply tasks
- thread/message correlation
- automatic summary capture from inbound mail
- reporting on send rate and reply rate
- generalized task infrastructure beyond estimate follow-ups
