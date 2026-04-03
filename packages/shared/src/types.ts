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
}

export enum PaymentMethod {
  CASH = 'CASH',
  CHECK = 'CHECK',
  CREDIT_CARD = 'CREDIT_CARD',
}

export enum ExpenseFrequency {
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  ANNUAL = 'ANNUAL',
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
  createdById: string;
  isDeleted: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
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
}

// --- Commission Calculation Types ---

export interface CommissionInput {
  projectTotal: number;
  paymentMethod: PaymentMethod;
  materialsCost: number;
  subOwedTotal: number;
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
