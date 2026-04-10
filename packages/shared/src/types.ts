// ============================================================
// Fencetastic Shared Types
// All enums, interfaces, and DTOs used across API and Web
// ============================================================

// --- Enums ---

export enum FenceType {
  WOOD = 'WOOD',
  METAL = 'METAL',
  CHAIN_LINK = 'CHAIN_LINK',
  VINYL = 'VINYL',
  GATE = 'GATE',
  OTHER = 'OTHER',
}

export enum ProjectStatus {
  ESTIMATE = 'ESTIMATE',
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CLOSED = 'CLOSED',
  WARRANTY = 'WARRANTY',
}

export enum PaymentMethod {
  CASH = 'CASH',
  CHECK = 'CHECK',
  CREDIT_CARD = 'CREDIT_CARD',
  ZELLE = 'ZELLE',
  FINANCING = 'FINANCING',
}

export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
}

export enum FenceStyle {
  NORMAL = 'NORMAL',
  STEPPED = 'STEPPED',
}

export enum ExpenseFrequency {
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  ANNUAL = 'ANNUAL',
}

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

export enum MaterialCategory {
  LUMBER = 'LUMBER',
  CONCRETE = 'CONCRETE',
  HARDWARE = 'HARDWARE',
  FASTENERS = 'FASTENERS',
  GATES = 'GATES',
  PANELS = 'PANELS',
  OTHER = 'OTHER',
}

// --- Domain Models ---

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export interface Project {
  id: string;
  customer: string;
  address: string;
  description: string;
  fenceType: FenceType;
  status: ProjectStatus;
  projectTotal: number;
  paymentMethod: PaymentMethod;
  moneyReceived: number;
  customerPaid: number;
  forecastedExpenses: number;
  materialsCost: number;
  contractDate: string;
  installDate: string;
  completedDate: string | null;
  estimateDate: string | null;
  followUpDate: string | null;
  linearFeet: number | null;
  rateTemplateId: string | null;
  subcontractor: string | null;
  notes: string | null;
  commissionOwed: number | null;
  commissionPaid: number | null;
  memesCommission: number | null;
  aimannsCommission: number | null;
  createdById: string;
  isDeleted: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

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

export interface ProjectFollowUpSummary {
  sequence: EstimateFollowUpSequence | null;
  tasks: EstimateFollowUpTask[];
  nextPendingTask: EstimateFollowUpTask | null;
}

export interface SubcontractorPayment {
  id: string;
  projectId: string;
  subcontractorName: string;
  amountOwed: number;
  amountPaid: number;
  datePaid: string | null;
  notes: string | null;
}

export interface ProjectNote {
  id: string;
  projectId: string;
  authorId: string;
  content: string;
  photoUrls: string[];
  createdAt: string;
}

export interface RateTemplate {
  id: string;
  fenceType: FenceType;
  name: string;
  ratePerFoot: number;
  laborRatePerFoot: number;
  description: string | null;
  isActive: boolean;
}

export interface AimannDebtLedgerEntry {
  id: string;
  projectId: string | null;
  amount: number;
  runningBalance: number;
  note: string;
  date: string;
}

export interface CommissionSnapshot {
  id: string;
  projectId: string;
  moneyReceived: number;
  totalExpenses: number;
  adnaanCommission: number;
  memeCommission: number;
  grossProfit: number;
  aimannDeduction: number;
  debtBalanceBefore: number;
  debtBalanceAfter: number;
  netProfit: number;
  settledAt: string;
}

export interface OperatingExpense {
  id: string;
  category: string;
  description: string;
  amount: number;
  frequency: ExpenseFrequency;
  isActive: boolean;
  effectiveFrom: string | null;
  effectiveTo: string | null;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  date: string;
  category: string;
  description: string;
  payee: string | null;
  paymentMethod: string | null;
  projectId: string | null;
  sourceField: string | null;
  subcategory: string | null;
  isAutoGenerated: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionSummary {
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
}

export interface CreateTransactionDTO {
  type: TransactionType;
  amount: number;
  date: string;
  category: string;
  description: string;
  payee?: string | null;
  paymentMethod?: string | null;
  projectId?: string | null;
  subcategory?: string | null;
}

export interface UpdateTransactionDTO {
  type?: TransactionType;
  amount?: number;
  date?: string;
  category?: string;
  description?: string;
  payee?: string | null;
  paymentMethod?: string | null;
  projectId?: string | null;
  subcategory?: string | null;
}

// --- Material Line Items ---

export interface MaterialLineItem {
  id: string;
  projectId: string;
  description: string;
  category: MaterialCategory;
  vendor: string | null;
  quantity: number;
  unitCost: number;
  totalCost: number;
  purchaseDate: string;
  transactionId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMaterialLineItemDTO {
  description: string;
  category: MaterialCategory;
  vendor?: string | null;
  quantity: number;
  unitCost: number;
  purchaseDate: string;
  transactionId?: string | null;
}

export interface UpdateMaterialLineItemDTO {
  description?: string;
  category?: MaterialCategory;
  vendor?: string | null;
  quantity?: number;
  unitCost?: number;
  purchaseDate?: string;
  transactionId?: string | null;
}

export interface TransactionListQuery {
  page?: number;
  limit?: number;
  type?: TransactionType;
  category?: string;
  search?: string;
  projectId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface FenceSegmentData {
  id?: string;
  segmentNumber: number;
  fenceType: string;
  style: FenceStyle;
  height: number;
  linearFeet: number;
  steps: Array<{ position: number; height: number }> | null;
  additions: string[];
  customAdditions: string[];
  notes: string | null;
}

export interface WorkOrderData {
  id: string;
  projectId: string;
  drawingData: Record<string, unknown>;
  propertyNotes: string | null;
  segments: FenceSegmentData[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorkOrderDTO {
  drawingData: Record<string, unknown>;
  propertyNotes?: string | null;
  segments: Omit<FenceSegmentData, 'id'>[];
}

export interface UpdateWorkOrderDTO {
  drawingData?: Record<string, unknown>;
  propertyNotes?: string | null;
  segments?: Omit<FenceSegmentData, 'id'>[];
}

export interface GridProjectRow {
  id: string;
  installDate: string | null;
  status: ProjectStatus;
  contractDate: string;
  notes: string | null;
  subcontractor: string | null;
  customer: string;
  address: string;
  description: string;
  projectTotal: number;
  moneyReceived: number;
  customerPaid: number;
  paymentMethod: PaymentMethod;
  outstandingReceivables: number;
  forecastedExpenses: number;
  materialsCost: number;
  subPayment1: number | null;
  subPayment2: number | null;
  commissionOwed: number | null;
  commissionPaid: number | null;
  outstandingPayables: number;
  profitDollar: number;
  profitPercent: number;
  memesCommission: number | null;
  aimannsCommission: number | null;
  netProfitDollar: number;
  netProfitPercent: number;
  fenceType: FenceType;
}

// --- Commission Calculation Types ---

export interface CommissionInput {
  projectTotal: number;
  paymentMethod: PaymentMethod;
  materialsCost: number;
  subOwedTotal: number;
  expenseOverride?: number;
  aimannDebtBalance: number;
}

export interface CommissionBreakdown {
  moneyReceived: number;
  totalExpenses: number;
  adnaanCommission: number;
  memeCommission: number;
  grossProfit: number;
  aimannDeduction: number;
  netProfit: number;
}

// --- Auth Types ---

export interface LoginRequest {
  email: string;
  password: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

// --- API Response Types ---

export interface ApiError {
  message: string;
  code?: string;
}

export interface ApiResponse<T> {
  data: T;
}

// --- Project DTOs ---

export interface CreateProjectDTO {
  customer: string;
  address: string;
  description: string;
  fenceType: FenceType;
  status?: ProjectStatus;
  projectTotal: number;
  paymentMethod: PaymentMethod;
  forecastedExpenses: number;
  materialsCost: number;
  contractDate: string;
  installDate: string;
  completedDate?: string | null;
  estimateDate?: string | null;
  followUpDate?: string | null;
  linearFeet?: number | null;
  rateTemplateId?: string | null;
  subcontractor?: string | null;
  notes?: string | null;
  commissionOwed?: number | null;
  commissionPaid?: number | null;
  memesCommission?: number | null;
  aimannsCommission?: number | null;
}

export interface UpdateProjectDTO {
  customer?: string;
  address?: string;
  description?: string;
  fenceType?: FenceType;
  status?: ProjectStatus;
  projectTotal?: number;
  paymentMethod?: PaymentMethod;
  forecastedExpenses?: number;
  materialsCost?: number;
  customerPaid?: number;
  contractDate?: string;
  installDate?: string;
  completedDate?: string | null;
  estimateDate?: string | null;
  followUpDate?: string | null;
  linearFeet?: number | null;
  rateTemplateId?: string | null;
  subcontractor?: string | null;
  notes?: string | null;
  commissionOwed?: number | null;
  commissionPaid?: number | null;
  memesCommission?: number | null;
  aimannsCommission?: number | null;
}

export interface ProjectListQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  status?: ProjectStatus;
  fenceType?: FenceType;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface CommissionPreview {
  moneyReceived: number;
  totalExpenses: number;
  adnaanCommission: number;
  memeCommission: number;
  grossProfit: number;
  aimannDeduction: number;
  netProfit: number;
  profitPercent: number;
}

export interface ProjectListItem {
  id: string;
  customer: string;
  address: string;
  fenceType: FenceType;
  status: ProjectStatus;
  projectTotal: number;
  moneyReceived: number;
  customerPaid: number;
  installDate: string;
  receivable: number;
  profitPercent: number;
}

export interface ProjectDetail extends Project {
  subcontractorPayments: SubcontractorPayment[];
  projectNotes: (ProjectNote & { author: { id: string; name: string } })[];
  commissionSnapshot: CommissionSnapshot | null;
  commissionPreview: CommissionPreview;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// --- SubcontractorPayment DTOs ---

export interface CreateSubcontractorPaymentDTO {
  subcontractorName: string;
  amountOwed: number;
  amountPaid?: number;
  datePaid?: string | null;
  notes?: string | null;
}

export interface UpdateSubcontractorPaymentDTO {
  subcontractorName?: string;
  amountOwed?: number;
  amountPaid?: number;
  datePaid?: string | null;
  notes?: string | null;
}

// --- ProjectNote DTOs ---

export interface NoteDTO {
  id: string;
  projectId: string;
  authorId: string;
  authorName: string;
  content: string;
  photoUrls: string[];
  createdAt: string;
}

export interface CreateNoteDTO {
  content: string;
  photoUrls?: string[];
}

export interface UpdateNoteDTO {
  content: string;
}

// --- Activity Log ---

export type ActivityType = 'status_change' | 'note_added';

export interface ActivityDTO {
  id: string;
  type: ActivityType;
  projectId: string;
  customer: string;
  description: string;
  createdAt: string;
}

// --- Upload ---

export interface UploadResponse {
  url: string;
  filename: string;
}

// --- Commission Page Types ---

export interface CommissionSummary {
  adnaanMTD: number;
  adnaanYTD: number;
  memeMTD: number;
  memeYTD: number;
}

export interface CommissionByProject {
  projectId: string;
  customer: string;
  projectTotal: number;
  adnaanCommission: number;
  memeCommission: number;
  aimannDeduction: number;
  netProfit: number;
  completedDate: string;
}

export interface PipelineProjection {
  projectId: string;
  customer: string;
  status: string;
  projectTotal: number;
  adnaanCommission: number;
  memeCommission: number;
  aimannDeduction: number;
  netProfit: number;
}

export interface PipelineProjectionSummary {
  projects: PipelineProjection[];
  totalAdnaan: number;
  totalMeme: number;
  totalAimann: number;
  totalNetProfit: number;
}

export interface DebtLedgerEntry {
  id: string;
  projectId: string | null;
  projectCustomer: string | null;
  amount: number;
  runningBalance: number;
  note: string;
  date: string;
}

export interface DebtBalanceResponse {
  balance: number;
}

export interface DebtAdjustmentDTO {
  amount: number;
  note: string;
  date?: string;
}

// ─── Dashboard DTOs ───────────────────────────────────────────────────────────

export interface MonthlyRevenueExpense {
  month: string;
  revenue: number;
  expenses: number;
}

export interface ProjectTypeBreakdown {
  fenceType: string;
  count: number;
}

export interface DashboardFollowUp {
  id: string;
  customer: string;
  address: string;
  status: string;
  followUpDate: string;
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

export interface DashboardActivityItem {
  id: string;
  projectId: string;
  customer: string;
  description: string;
  createdAt: string;
}

export interface DashboardUpcomingInstall {
  id: string;
  customer: string;
  address: string;
  fenceType: string;
  status: string;
  installDate: string;
}

export interface DashboardData {
  kpis: {
    revenueMTD: number;
    openProjects: number;
    outstandingReceivables: number;
    aimannDebtBalance: number;
  };
  monthlyRevenueExpenses: MonthlyRevenueExpense[];
  projectTypeBreakdown: ProjectTypeBreakdown[];
  todaysFollowUps: DashboardFollowUpTask[];
  recentActivity: DashboardActivityItem[];
  upcomingInstalls: DashboardUpcomingInstall[];
}

// ─── Rate Template DTOs ───────────────────────────────────────────────────────

export interface CreateRateTemplateDTO {
  fenceType: FenceType;
  name: string;
  ratePerFoot: number;
  laborRatePerFoot: number;
  description?: string | null;
}

export interface UpdateRateTemplateDTO {
  fenceType?: FenceType;
  name?: string;
  ratePerFoot?: number;
  laborRatePerFoot?: number;
  description?: string | null;
}

// ─── Operating Expense DTOs ───────────────────────────────────────────────────

export interface CreateOperatingExpenseDTO {
  category: string;
  description: string;
  amount: number;
  frequency: ExpenseFrequency;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
}

export interface UpdateOperatingExpenseDTO {
  category?: string;
  description?: string;
  amount?: number;
  frequency?: ExpenseFrequency;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
}

// ─── Report DTOs ──────────────────────────────────────────────────────────────

export interface MonthlyPLRow {
  month: string;
  revenue: number;
  expenses: number;
  adnaanCommission: number;
  memeCommission: number;
  aimannDeduction: number;
  operatingExpenses: number;
  netProfit: number;
}

export interface AvgDurationByType {
  fenceType: string;
  avgDays: number;
  count: number;
}

export interface CompletionsPerMonth {
  month: string;
  count: number;
}

export interface ProjectStatsData {
  avgDurationByType: AvgDurationByType[];
  completionsPerMonth: CompletionsPerMonth[];
}

export interface ReceivablesProject {
  id: string;
  customer: string;
  address: string;
  fenceType: string;
  contractDate: string;
  projectTotal: number;
  customerPaid: number;
  outstanding: number;
  ageDays: number;
}

export interface ReceivablesAgingData {
  bucket0_30: ReceivablesProject[];
  bucket31_60: ReceivablesProject[];
  bucket61_90: ReceivablesProject[];
  bucket90plus: ReceivablesProject[];
  totals: {
    bucket0_30: number;
    bucket31_60: number;
    bucket61_90: number;
    bucket90plus: number;
    overall: number;
  };
}

// --- Financial Report Types ---

export interface PnlRow {
  month: string;
  revenue: number;
  cogs: number;
  grossProfit: number;
  operatingExpenses: number;
  commissions: number;
  netProfit: number;
}

export interface PnlReport {
  rows: PnlRow[];
  totals: Omit<PnlRow, 'month'>;
}

export interface JobCostingRow {
  projectId: string;
  customer: string;
  address: string;
  status: ProjectStatus;
  fenceType: string;
  revenue: number;
  materials: number;
  subcontractors: number;
  otherExpenses: number;
  commissionsAdnaan: number;
  commissionsMeme: number;
  profit: number;
  marginPct: number;
}

export interface CommissionSummaryPerson {
  name: string;
  rows: {
    projectId: string;
    customer: string;
    address: string;
    projectTotal: number;
    commission: number;
  }[];
  periodTotal: number;
  aimannDeductions: number;
  netPayout: number;
}

export interface CommissionSummaryReport {
  settled: {
    adnaan: CommissionSummaryPerson;
    meme: CommissionSummaryPerson;
  };
  pending: {
    adnaan: CommissionSummaryPerson;
    meme: CommissionSummaryPerson;
  };
}

export interface ExpenseByCategoryRow {
  category: string;
  subcategories: { name: string; amount: number }[];
  total: number;
}

export interface ExpenseByVendorRow {
  vendor: string;
  totalSpend: number;
  projectCount: number;
  topCategories: string[];
}

export interface ExpenseBreakdownReport {
  byCategory: ExpenseByCategoryRow[];
  byVendor: ExpenseByVendorRow[];
  total: number;
}

export interface CashFlowRow {
  month: string;
  moneyIn: number;
  moneyOut: number;
  netCashFlow: number;
  runningBalance: number;
}
