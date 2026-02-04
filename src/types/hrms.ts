// HRMS Core Types

export type UserRole = 'super_admin' | 'payroll_operator';

export type SalaryType = 'monthly' | 'daily';

export type MonthCalculationType = 'calendar' | 'fixed_26';

export interface Employee {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  department: string;
  designation: string;
  dateOfJoining: Date;
  grossMonthlySalary: number;
  salaryType: SalaryType;
  monthCalculationType: MonthCalculationType;
  isPFEnabled: boolean;
  isESIEnabled: boolean;
  isTDSEnabled: boolean;
  bankAccountNumber: string;
  bankName: string;
  ifscCode: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  month: number;
  year: number;
  presentDays: number;
  totalDays: number;
  overtimeHours: number;
  oneTimeSalaryOverride?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PayrollRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  month: number;
  year: number;
  presentDays: number;
  totalDays: number;
  grossSalary: number;
  proRataSalary: number;
  overtimeAmount: number;
  oneTimeBonus: number;
  previousMonthAdjustment: number;
  totalEarnings: number;
  pfDeduction: number;
  esiDeduction: number;
  tdsDeduction: number;
  otherDeductions: number;
  totalDeductions: number;
  netPayable: number;
  isTDSFlagged: boolean;
  isLocked: boolean;
  lockedBy?: string;
  lockedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  entityType: 'employee' | 'attendance' | 'payroll' | 'settings';
  entityId: string;
  previousValue?: string;
  newValue?: string;
  ipAddress?: string;
  timestamp: Date;
}

export interface GlobalSettings {
  pfPercentage: number;
  esiPercentage: number;
  tdsThreshold: number;
  tdsPercentage: number;
  defaultMonthCalculationType: MonthCalculationType;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

// Calculation helpers
export interface PayrollCalculationInput {
  employee: Employee;
  attendance: AttendanceRecord;
  previousMonthAdjustment: number;
  settings: GlobalSettings;
}

export interface PayrollCalculationResult {
  grossSalary: number;
  proRataSalary: number;
  overtimeAmount: number;
  oneTimeBonus: number;
  previousMonthAdjustment: number;
  totalEarnings: number;
  pfDeduction: number;
  esiDeduction: number;
  tdsDeduction: number;
  totalDeductions: number;
  netPayable: number;
  isTDSFlagged: boolean;
}
