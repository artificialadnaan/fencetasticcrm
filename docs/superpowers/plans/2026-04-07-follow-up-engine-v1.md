# Follow-Up Engine V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a CRM-native estimate follow-up engine with sequence/task persistence, project-triggered task generation, closure actions, and task-backed project detail, dashboard, and calendar surfaces.

**Architecture:** Add dedicated follow-up sequence and task models in Prisma, keep project lifecycle hooks responsible for sequence creation when a project enters `ESTIMATE`, and expose dedicated follow-up APIs for project-detail management. Replace legacy `followUpDate` reads in dashboard and calendar with pending follow-up task queries, and remove the conflicting single follow-up date controls from the web UI surfaces touched by the feature.

**Tech Stack:** Prisma, PostgreSQL, Express, Zod, React, TypeScript, Vite, Vitest

---

## File Structure

### API / Shared

- Modify: `/Users/adnaaniqbal/Developer/FencetasticMaster/FencetasticCRM/apps/api/prisma/schema.prisma`
  - Add follow-up models and enums.
- Create: `/Users/adnaaniqbal/Developer/FencetasticMaster/FencetasticCRM/apps/api/src/services/follow-up.service.ts`
  - Own sequence creation, task generation, task updates, closure logic, and dashboard/calendar queries.
- Create: `/Users/adnaaniqbal/Developer/FencetasticMaster/FencetasticCRM/apps/api/src/routes/follow-ups.ts`
  - Dedicated follow-up API routes.
- Modify: `/Users/adnaaniqbal/Developer/FencetasticMaster/FencetasticCRM/apps/api/src/index.ts`
  - Mount the new follow-up router.
- Modify: `/Users/adnaaniqbal/Developer/FencetasticMaster/FencetasticCRM/apps/api/src/services/project.service.ts`
  - Trigger sequence creation from project create/update flows.
- Modify: `/Users/adnaaniqbal/Developer/FencetasticMaster/FencetasticCRM/apps/api/src/services/dashboard.service.ts`
  - Replace legacy `followUpDate` query with pending follow-up task query.
- Modify: `/Users/adnaaniqbal/Developer/FencetasticMaster/FencetasticCRM/apps/api/src/services/calendar.service.ts`
  - Replace legacy follow-up calendar events with pending follow-up task events.
- Modify: `/Users/adnaaniqbal/Developer/FencetasticMaster/FencetasticCRM/packages/shared/src/types.ts`
  - Add follow-up enums, domain types, and DTOs.
- Create: `/Users/adnaaniqbal/Developer/FencetasticMaster/FencetasticCRM/apps/api/src/__tests__/follow-up.service.test.ts`
  - Cover sequence creation, task generation, completion, and closure.
- Modify: `/Users/adnaaniqbal/Developer/FencetasticMaster/FencetasticCRM/apps/api/src/__tests__/project.service.test.ts`
  - Cover project-triggered sequence creation.

### Web

- Create: `/Users/adnaaniqbal/Developer/FencetasticMaster/FencetasticCRM/apps/web/src/hooks/use-follow-up-sequence.ts`
  - Fetch and mutate project follow-up state.
- Create: `/Users/adnaaniqbal/Developer/FencetasticMaster/FencetasticCRM/apps/web/src/components/projects/follow-up-panel.tsx`
  - Project-detail follow-up workspace.
- Modify: `/Users/adnaaniqbal/Developer/FencetasticMaster/FencetasticCRM/apps/web/src/pages/project-detail.tsx`
  - Add a follow-up tab/section and remove legacy single-date follow-up editing.
- Modify: `/Users/adnaaniqbal/Developer/FencetasticMaster/FencetasticCRM/apps/web/src/components/projects/create-project-dialog.tsx`
  - Remove the legacy `followUpDate` input.
- Modify: `/Users/adnaaniqbal/Developer/FencetasticMaster/FencetasticCRM/apps/web/src/hooks/use-dashboard.ts`
  - Adopt the new shared dashboard follow-up data shape if needed.
- Modify: `/Users/adnaaniqbal/Developer/FencetasticMaster/FencetasticCRM/apps/web/src/hooks/use-calendar-events.ts`
  - Adopt the new follow-up task-backed event metadata if needed.
- Modify: `/Users/adnaaniqbal/Developer/FencetasticMaster/FencetasticCRM/apps/web/src/components/dashboard/redesign/dashboard-followups-panel.tsx`
  - Render task-backed follow-up items.
- Modify: `/Users/adnaaniqbal/Developer/FencetasticMaster/FencetasticCRM/apps/web/src/components/calendar/redesign/calendar-side-insights.tsx`
  - Keep counts/labels aligned with task-backed follow-up events.
- Create: `/Users/adnaaniqbal/Developer/FencetasticMaster/FencetasticCRM/apps/web/src/components/projects/follow-up-panel.test.tsx`
  - UI tests for follow-up rendering and lost-close validation.

---

### Task 1: Add Shared Follow-Up Types And Prisma Models

**Files:**
- Modify: `/Users/adnaaniqbal/Developer/FencetasticMaster/FencetasticCRM/packages/shared/src/types.ts`
- Modify: `/Users/adnaaniqbal/Developer/FencetasticMaster/FencetasticCRM/apps/api/prisma/schema.prisma`

- [ ] **Step 1: Add the failing shared follow-up types**

Add the new shared enums and interfaces near the existing project and dashboard types:

```ts
export enum EstimateFollowUpSequenceStatus {
  ACTIVE = 'ACTIVE',
  WON = 'WON',
  LOST = 'LOST',
  CLOSED = 'CLOSED',
}

export enum EstimateFollowUpTaskKind {
  DAY_1 = 'DAY_1',
  DAY_3 = 'DAY_3',
  DAY_7 = 'DAY_7',
  DAY_14 = 'DAY_14',
}

export enum EstimateFollowUpTaskStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  SKIPPED = 'SKIPPED',
}

export enum EstimateFollowUpLostReasonCode {
  PRICE = 'PRICE',
  NO_RESPONSE = 'NO_RESPONSE',
  CHOSE_COMPETITOR = 'CHOSE_COMPETITOR',
  TIMING = 'TIMING',
  FINANCING = 'FINANCING',
  SCOPE_MISMATCH = 'SCOPE_MISMATCH',
  DUPLICATE_BAD_LEAD = 'DUPLICATE_BAD_LEAD',
  OTHER = 'OTHER',
}
```

- [ ] **Step 2: Add follow-up domain and DTO interfaces**

Add the shape the API and web will share:

```ts
export interface EstimateFollowUpSequence {
  id: string;
  projectId: string;
  status: EstimateFollowUpSequenceStatus;
  startedAt: string;
  closedAt: string | null;
  closedSummary: string | null;
  lostReasonCode: EstimateFollowUpLostReasonCode | null;
  lostReasonNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EstimateFollowUpTask {
  id: string;
  sequenceId: string;
  projectId: string;
  kind: EstimateFollowUpTaskKind;
  dueDate: string;
  status: EstimateFollowUpTaskStatus;
  draftSubject: string;
  draftBody: string;
  completedAt: string | null;
  completedByUserId: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}
```

- [ ] **Step 3: Extend shared project and dashboard response types**

Add response shapes the UI can consume without local remapping:

```ts
export interface ProjectFollowUpSummary {
  sequence: EstimateFollowUpSequence | null;
  tasks: EstimateFollowUpTask[];
  nextPendingTask: EstimateFollowUpTask | null;
}

export interface DashboardFollowUpTask {
  id: string;
  projectId: string;
  customer: string;
  address: string;
  status: ProjectStatus;
  dueDate: string;
  kind: EstimateFollowUpTaskKind;
}
```

- [ ] **Step 4: Add Prisma enums and models**

Add the schema definitions under `Project` and `User` relations plus new models:

```prisma
model EstimateFollowUpSequence {
  id              String                         @id @default(uuid()) @db.Uuid
  projectId       String                         @map("project_id") @db.Uuid
  status          EstimateFollowUpSequenceStatus @default(ACTIVE)
  startedAt       DateTime                       @default(now()) @map("started_at") @db.Timestamptz
  closedAt        DateTime?                      @map("closed_at") @db.Timestamptz
  closedSummary   String?                        @map("closed_summary") @db.Text
  lostReasonCode  EstimateFollowUpLostReasonCode? @map("lost_reason_code")
  lostReasonNotes String?                        @map("lost_reason_notes") @db.Text
  createdAt       DateTime                       @default(now()) @map("created_at") @db.Timestamptz
  updatedAt       DateTime                       @updatedAt @map("updated_at") @db.Timestamptz

  project Project                @relation(fields: [projectId], references: [id])
  tasks   EstimateFollowUpTask[]

  @@index([projectId, status])
  @@map("estimate_follow_up_sequences")
}
```

- [ ] **Step 5: Add the task model and user relation**

Add the task model and `completedBy` relation:

```prisma
model EstimateFollowUpTask {
  id                String                     @id @default(uuid()) @db.Uuid
  sequenceId        String                     @map("sequence_id") @db.Uuid
  projectId         String                     @map("project_id") @db.Uuid
  kind              EstimateFollowUpTaskKind
  dueDate           DateTime                   @map("due_date") @db.Date
  status            EstimateFollowUpTaskStatus @default(PENDING)
  draftSubject      String                     @map("draft_subject")
  draftBody         String                     @map("draft_body") @db.Text
  completedAt       DateTime?                  @map("completed_at") @db.Timestamptz
  completedByUserId String?                    @map("completed_by_user_id") @db.Uuid
  notes             String?                    @db.Text
  createdAt         DateTime                   @default(now()) @map("created_at") @db.Timestamptz
  updatedAt         DateTime                   @updatedAt @map("updated_at") @db.Timestamptz
}
```

- [ ] **Step 6: Run the shared build to verify the new type surface compiles**

Run:

```bash
npm run build -w packages/shared
```

Expected: shared package build exits `0`.

- [ ] **Step 7: Commit**

```bash
git add packages/shared/src/types.ts apps/api/prisma/schema.prisma
git commit -m "Add follow-up engine schema and shared types"
```

### Task 2: Build The Follow-Up Service With Red-Green Tests

**Files:**
- Create: `/Users/adnaaniqbal/Developer/FencetasticMaster/FencetasticCRM/apps/api/src/services/follow-up.service.ts`
- Create: `/Users/adnaaniqbal/Developer/FencetasticMaster/FencetasticCRM/apps/api/src/__tests__/follow-up.service.test.ts`

- [ ] **Step 1: Write the failing service tests for sequence creation**

Add tests covering:

```ts
it('creates one active sequence and day 1/3/7/14 tasks from estimateDate', async () => {
  const project = await createEstimateProject();
  const summary = await ensureEstimateFollowUpSequence(project.id, project.createdById);

  expect(summary.sequence?.status).toBe('ACTIVE');
  expect(summary.tasks.map((task) => task.kind)).toEqual(['DAY_1', 'DAY_3', 'DAY_7', 'DAY_14']);
  expect(summary.tasks.map((task) => task.dueDate)).toEqual([
    '2026-04-04',
    '2026-04-06',
    '2026-04-10',
    '2026-04-17',
  ]);
});
```

- [ ] **Step 2: Add the failing tests for duplication and closure**

Add tests for:

```ts
it('does not create a duplicate active sequence when called twice', async () => { /* ... */ });
it('requires lost reason code and notes when closing as LOST', async () => { /* ... */ });
it('marks future pending tasks skipped when closing a sequence', async () => { /* ... */ });
it('records completedAt and completedByUserId when a task is completed', async () => { /* ... */ });
```

- [ ] **Step 3: Run the API test file to verify it fails**

Run:

```bash
npm run test -w apps/api -- follow-up.service.test.ts
```

Expected: FAIL with missing service/module and missing types.

- [ ] **Step 4: Implement the service helpers**

Implement focused helpers in `follow-up.service.ts`:

```ts
const FOLLOW_UP_DAY_OFFSETS: Array<[EstimateFollowUpTaskKind, number]> = [
  [EstimateFollowUpTaskKind.DAY_1, 1],
  [EstimateFollowUpTaskKind.DAY_3, 3],
  [EstimateFollowUpTaskKind.DAY_7, 7],
  [EstimateFollowUpTaskKind.DAY_14, 14],
];

function buildDraftSubject(customer: string, kind: EstimateFollowUpTaskKind) {
  return `Fencetastic estimate follow-up (${kind.replace('_', ' ')}) for ${customer}`;
}
```

- [ ] **Step 5: Implement transactional sequence creation**

Create a single service entrypoint:

```ts
export async function ensureEstimateFollowUpSequence(projectId: string, userId: string) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.estimateFollowUpSequence.findFirst({
      where: { projectId, status: EstimateFollowUpSequenceStatus.ACTIVE },
      include: { tasks: { orderBy: { dueDate: 'asc' } } },
    });
    if (existing) return mapProjectFollowUpSummary(existing);
    // create sequence + 4 tasks here
  });
}
```

- [ ] **Step 6: Implement task completion and sequence closure**

Implement:

```ts
export async function completeFollowUpTask(taskId: string, userId: string) { /* ... */ }
export async function updateFollowUpTask(taskId: string, input: UpdateEstimateFollowUpTaskDTO) { /* ... */ }
export async function closeFollowUpSequence(sequenceId: string, input: CloseEstimateFollowUpSequenceDTO) { /* ... */ }
```

- [ ] **Step 7: Re-run the targeted API tests**

Run:

```bash
npm run test -w apps/api -- follow-up.service.test.ts
```

Expected: PASS for the new follow-up service tests.

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/services/follow-up.service.ts apps/api/src/__tests__/follow-up.service.test.ts
git commit -m "Add follow-up service and tests"
```

### Task 3: Hook Project Lifecycle Into Follow-Up Creation

**Files:**
- Modify: `/Users/adnaaniqbal/Developer/FencetasticMaster/FencetasticCRM/apps/api/src/services/project.service.ts`
- Modify: `/Users/adnaaniqbal/Developer/FencetasticMaster/FencetasticCRM/apps/api/src/__tests__/project.service.test.ts`

- [ ] **Step 1: Write the failing project-service tests**

Add coverage for:

```ts
it('creates a follow-up sequence when an ESTIMATE project is created', async () => { /* ... */ });
it('creates a follow-up sequence when a project transitions into ESTIMATE', async () => { /* ... */ });
it('does not create a second active sequence when an estimate project is resaved', async () => { /* ... */ });
```

- [ ] **Step 2: Run the project-service tests to verify failure**

Run:

```bash
npm run test -w apps/api -- project.service.test.ts
```

Expected: FAIL on missing follow-up sequence side effects.

- [ ] **Step 3: Integrate sequence creation into `createProject()`**

After the project record is created:

```ts
if (created.status === ProjectStatus.ESTIMATE) {
  await ensureEstimateFollowUpSequence(created.id, userId);
}
```

- [ ] **Step 4: Integrate sequence creation into `updateProject()`**

Use the existing transition logic near `isMovingToEstimate` and add:

```ts
if (isMovingToEstimate) {
  await ensureEstimateFollowUpSequence(project.id, current.createdById);
}
```

- [ ] **Step 5: Re-run the project-service tests**

Run:

```bash
npm run test -w apps/api -- project.service.test.ts
```

Expected: PASS for both existing project coverage and new follow-up lifecycle assertions.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/services/project.service.ts apps/api/src/__tests__/project.service.test.ts
git commit -m "Create follow-up sequences from project lifecycle"
```

### Task 4: Add Follow-Up Routes And Replace Dashboard / Calendar Reads

**Files:**
- Create: `/Users/adnaaniqbal/Developer/FencetasticMaster/FencetasticCRM/apps/api/src/routes/follow-ups.ts`
- Modify: `/Users/adnaaniqbal/Developer/FencetasticMaster/FencetasticCRM/apps/api/src/index.ts`
- Modify: `/Users/adnaaniqbal/Developer/FencetasticMaster/FencetasticCRM/apps/api/src/services/dashboard.service.ts`
- Modify: `/Users/adnaaniqbal/Developer/FencetasticMaster/FencetasticCRM/apps/api/src/services/calendar.service.ts`

- [ ] **Step 1: Add the failing route and query tests**

Add route/service tests for:

```ts
it('returns a project follow-up summary', async () => { /* GET /api/follow-ups/projects/:projectId */ });
it('updates draft subject/body and notes for a task', async () => { /* PATCH /api/follow-ups/tasks/:taskId */ });
it('returns dashboard follow-ups from pending follow-up tasks instead of project.followUpDate', async () => { /* ... */ });
it('returns calendar follow-up events from pending follow-up tasks instead of project.followUpDate', async () => { /* ... */ });
```

- [ ] **Step 2: Implement the follow-up router**

Expose:

```ts
followUpRouter.get('/projects/:projectId', requireAuth, async (...) => { /* ... */ });
followUpRouter.patch('/tasks/:taskId', requireAuth, validate(updateTaskSchema), async (...) => { /* ... */ });
followUpRouter.post('/tasks/:taskId/complete', requireAuth, async (...) => { /* ... */ });
followUpRouter.post('/sequences/:sequenceId/close', requireAuth, validate(closeSequenceSchema), async (...) => { /* ... */ });
```

- [ ] **Step 3: Mount the router in the API entrypoint**

Add to `index.ts`:

```ts
import { followUpRouter } from './routes/follow-ups';
app.use('/api/follow-ups', followUpRouter);
```

- [ ] **Step 4: Replace dashboard follow-up queries**

In `dashboard.service.ts`, replace the legacy `Project.followUpDate` query with a pending-task query joined to the project:

```ts
prisma.estimateFollowUpTask.findMany({
  where: { status: EstimateFollowUpTaskStatus.PENDING, dueDate: { lte: endOfToday } },
  include: { project: { select: { id: true, customer: true, address: true, status: true, isDeleted: true } } },
})
```

- [ ] **Step 5: Replace calendar follow-up events**

In `calendar.service.ts`, replace the project-level `followUpDate` branch with:

```ts
const followUpTasks = await prisma.estimateFollowUpTask.findMany({
  where: {
    status: EstimateFollowUpTaskStatus.PENDING,
    dueDate: { gte: startDate, lt: endDate },
  },
  include: { project: { select: { id: true, customer: true, isDeleted: true } } },
});
```

- [ ] **Step 6: Run the API test suite**

Run:

```bash
npm run test:api
```

Expected: API tests pass with follow-up routes, dashboard, and calendar reading from tasks.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/routes/follow-ups.ts apps/api/src/index.ts apps/api/src/services/dashboard.service.ts apps/api/src/services/calendar.service.ts
git commit -m "Expose follow-up APIs and task-backed dashboard views"
```

### Task 5: Add The Project Detail Follow-Up Workspace

**Files:**
- Create: `/Users/adnaaniqbal/Developer/FencetasticMaster/FencetasticCRM/apps/web/src/hooks/use-follow-up-sequence.ts`
- Create: `/Users/adnaaniqbal/Developer/FencetasticMaster/FencetasticCRM/apps/web/src/components/projects/follow-up-panel.tsx`
- Create: `/Users/adnaaniqbal/Developer/FencetasticMaster/FencetasticCRM/apps/web/src/components/projects/follow-up-panel.test.tsx`
- Modify: `/Users/adnaaniqbal/Developer/FencetasticMaster/FencetasticCRM/apps/web/src/pages/project-detail.tsx`
- Modify: `/Users/adnaaniqbal/Developer/FencetasticMaster/FencetasticCRM/apps/web/src/components/projects/create-project-dialog.tsx`

- [ ] **Step 1: Write the failing UI tests**

Add tests covering:

```tsx
it('renders sequence status, next task, and all scheduled tasks', async () => { /* ... */ });
it('requires both lost reason code and notes before closing as LOST', async () => { /* ... */ });
it('saves draft edits and completes a task', async () => { /* ... */ });
```

- [ ] **Step 2: Run the web test target to verify failure**

Run:

```bash
npm run test -w apps/web -- follow-up-panel.test.tsx
```

Expected: FAIL because the hook and panel do not exist yet.

- [ ] **Step 3: Add the follow-up hook**

Implement the hook with narrow mutations:

```ts
export function useFollowUpSequence(projectId: string | undefined) {
  // GET /api/follow-ups/projects/:projectId
  // PATCH /api/follow-ups/tasks/:taskId
  // POST /api/follow-ups/tasks/:taskId/complete
  // POST /api/follow-ups/sequences/:sequenceId/close
}
```

- [ ] **Step 4: Build the follow-up panel**

Render:

```tsx
<section>
  <h2>Follow-Up</h2>
  <p>{summary.sequence?.status ?? 'No active sequence'}</p>
  {summary.tasks.map((task) => (
    <article key={task.id}>{task.draftSubject}</article>
  ))}
</section>
```

- [ ] **Step 5: Integrate the panel into project detail**

Add a `follow-up` tab to `TABS`, render `<FollowUpPanel projectId={id} />`, and remove the legacy single follow-up date editor from the overview flow.

- [ ] **Step 6: Remove the create-project dialog legacy field**

Delete the `followUpDate` state and form control from `create-project-dialog.tsx`, leaving `estimateDate` as the only follow-up engine anchor input.

- [ ] **Step 7: Re-run the targeted web tests**

Run:

```bash
npm run test -w apps/web -- follow-up-panel.test.tsx
```

Expected: PASS for the new project-detail follow-up UI tests.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/hooks/use-follow-up-sequence.ts apps/web/src/components/projects/follow-up-panel.tsx apps/web/src/components/projects/follow-up-panel.test.tsx apps/web/src/pages/project-detail.tsx apps/web/src/components/projects/create-project-dialog.tsx
git commit -m "Add follow-up workflow to project detail"
```

### Task 6: Finish Dashboard And Calendar UI Integration

**Files:**
- Modify: `/Users/adnaaniqbal/Developer/FencetasticMaster/FencetasticCRM/apps/web/src/hooks/use-dashboard.ts`
- Modify: `/Users/adnaaniqbal/Developer/FencetasticMaster/FencetasticCRM/apps/web/src/hooks/use-calendar-events.ts`
- Modify: `/Users/adnaaniqbal/Developer/FencetasticMaster/FencetasticCRM/apps/web/src/components/dashboard/redesign/dashboard-followups-panel.tsx`
- Modify: `/Users/adnaaniqbal/Developer/FencetasticMaster/FencetasticCRM/apps/web/src/components/calendar/redesign/calendar-side-insights.tsx`

- [ ] **Step 1: Write the failing dashboard/calendar rendering tests**

Add coverage for:

```tsx
it('renders dashboard follow-up cards from due task data', async () => { /* ... */ });
it('counts follow-up calendar events from task-backed follow-up items', async () => { /* ... */ });
```

- [ ] **Step 2: Update the shared web hooks**

Adjust the hook response types only as needed, for example:

```ts
setData(res.data.data as DashboardData);
setEvents(res.data.data as CalendarEvent[]);
```

Keep the hooks small and let the API own the shape.

- [ ] **Step 3: Update the dashboard follow-up panel**

Render `dueDate` and `kind` from the new task-backed type instead of the old single `followUpDate`.

- [ ] **Step 4: Update the calendar side insights copy and counts**

Keep the legend and monthly counts consistent with task-backed follow-up events so the redesigned calendar summary remains correct.

- [ ] **Step 5: Run the web test suite**

Run:

```bash
npm run test -w apps/web
```

Expected: web tests pass with the new follow-up UI and updated dashboard/calendar surfaces.

- [ ] **Step 6: Run a production build**

Run:

```bash
npm run build
```

Expected: root build exits `0` with shared, API, and web packages compiling cleanly.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/hooks/use-dashboard.ts apps/web/src/hooks/use-calendar-events.ts apps/web/src/components/dashboard/redesign/dashboard-followups-panel.tsx apps/web/src/components/calendar/redesign/calendar-side-insights.tsx
git commit -m "Finish follow-up engine dashboard and calendar integration"
```

### Task 7: End-To-End Verification

**Files:**
- Verify only: existing app and test files

- [ ] **Step 1: Run the API suite**

Run:

```bash
npm run test:api
```

Expected: `0` failures.

- [ ] **Step 2: Run the web suite**

Run:

```bash
npm run test -w apps/web
```

Expected: `0` failures.

- [ ] **Step 3: Run the full build**

Run:

```bash
npm run build
```

Expected: exit `0`.

- [ ] **Step 4: Manually verify the feature**

Check:

- create a project in `ESTIMATE` and confirm one active sequence plus 4 tasks exist
- move a non-estimate project into `ESTIMATE` and confirm one active sequence is created
- confirm project detail shows draft editing, task completion, and close controls
- confirm `LOST` requires reason code and notes
- confirm dashboard shows due and overdue pending tasks
- confirm calendar shows pending follow-up tasks on due dates
- confirm the create-project dialog no longer exposes the legacy single follow-up date input

- [ ] **Step 5: Commit final cleanup if needed**

```bash
git status --short
```

Expected: only intentional follow-up engine files remain modified.
