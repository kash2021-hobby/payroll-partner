import { Employee } from '@/types/hrms';

/**
 * Input for salary calculation
 */
export interface SalaryCalculationInput {
  employeeId: string;
  month: number; // 1-12
  year: number;
  presentDays: number;
  employee: Employee;
}

/**
 * Output JSON structure for salary calculation
 */
export interface SalaryCalculationOutput {
  employeeId: string;
  month: number;
  year: number;
  calendarDays: number;
  presentDays: number;
  
  // Earnings
  Gross: number;
  Basic: number;
  HRA: number;
  OtherAllowances: number;
  ProRataSalary: number;
  
  // Deductions
  PF_Eligible: boolean;
  PF_Amount: number;
  ESI_Eligible: boolean;
  ESI_Amount: number;
  
  // Flags
  TDS_Warning: boolean;
  
  // Final
  TotalDeductions: number;
  NetPayable: number;
}

/**
 * Get the number of calendar days in a given month
 */
export function getCalendarDays(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Core Salary Calculation Logic
 * 
 * Implements:
 * 1. Pro-Rata Formula: (Monthly Salary / Calendar Days) * Days Active
 * 2. PF: 12% of Basic (only if toggle ON and Basic <= 15000)
 * 3. ESI: 0.75% of Gross (only if toggle ON and Gross <= 21000)
 * 4. TDS_Warning flag if Gross > 50,000
 * 
 * @param input - Employee ID, Month, Year, Present Days, and Employee config
 * @returns SalaryCalculationOutput JSON object
 */
export function calculateSalary(input: SalaryCalculationInput): SalaryCalculationOutput {
  const { employeeId, month, year, presentDays, employee } = input;
  
  // Step 1: Get calendar days for the month
  const calendarDays = employee.monthCalculationType === 'fixed_26' 
    ? 26 
    : getCalendarDays(year, month);
  
  // Step 2: Calculate Pro-Rata Salary
  // Formula: (Monthly Salary / Calendar Days) * Days Active
  const dailyRate = employee.grossMonthlySalary / calendarDays;
  const ProRataSalary = Math.round(dailyRate * presentDays);
  
  // Step 3: Calculate salary components (standard Indian structure)
  // Basic: 50% of Gross
  // HRA: 20% of Gross  
  // Other Allowances: 30% of Gross
  const Gross = ProRataSalary;
  const Basic = Math.round(Gross * 0.50);
  const HRA = Math.round(Gross * 0.20);
  const OtherAllowances = Gross - Basic - HRA; // Remaining amount
  
  // Step 4: Calculate PF Deduction
  // PF = 12% of Basic, ONLY if:
  //   - PF toggle is ON
  //   - Basic salary <= 15000
  const PF_Eligible = employee.isPFEnabled && Basic <= 15000;
  const PF_Amount = PF_Eligible ? Math.round(Basic * 0.12) : 0;
  
  // Step 5: Calculate ESI Deduction
  // ESI = 0.75% of Gross, ONLY if:
  //   - ESI toggle is ON
  //   - Gross salary <= 21000
  const ESI_Eligible = employee.isESIEnabled && Gross <= 21000;
  const ESI_Amount = ESI_Eligible ? Math.round(Gross * 0.0075) : 0;
  
  // Step 6: TDS Warning Flag
  // Set warning if Gross > 50,000
  const TDS_Warning = Gross > 50000;
  
  // Step 7: Calculate totals
  const TotalDeductions = PF_Amount + ESI_Amount;
  const NetPayable = ProRataSalary - TotalDeductions;
  
  return {
    employeeId,
    month,
    year,
    calendarDays,
    presentDays,
    Gross,
    Basic,
    HRA,
    OtherAllowances,
    ProRataSalary,
    PF_Eligible,
    PF_Amount,
    ESI_Eligible,
    ESI_Amount,
    TDS_Warning,
    TotalDeductions,
    NetPayable,
  };
}

/**
 * Simplified calculation function that takes just the core inputs
 * Returns the exact JSON structure requested
 */
export function calculateCoreSalary(
  monthlyGrossSalary: number,
  calendarDays: number,
  presentDays: number,
  isPFEnabled: boolean,
  isESIEnabled: boolean
): {
  Gross: number;
  Basic: number;
  PF_Amount: number;
  ESI_Amount: number;
  TDS_Warning: boolean;
} {
  // Pro-Rata Formula: (Monthly Salary / Calendar Days) * Days Active
  const Gross = Math.round((monthlyGrossSalary / calendarDays) * presentDays);
  
  // Basic is 50% of Gross
  const Basic = Math.round(Gross * 0.50);
  
  // PF: 12% of Basic, only if toggle ON AND Basic <= 15000
  const PF_Amount = (isPFEnabled && Basic <= 15000) 
    ? Math.round(Basic * 0.12) 
    : 0;
  
  // ESI: 0.75% of Gross, only if toggle ON AND Gross <= 21000
  const ESI_Amount = (isESIEnabled && Gross <= 21000) 
    ? Math.round(Gross * 0.0075) 
    : 0;
  
  // TDS Warning if Gross > 50,000
  const TDS_Warning = Gross > 50000;
  
  return {
    Gross,
    Basic,
    PF_Amount,
    ESI_Amount,
    TDS_Warning,
  };
}

/**
 * Format the calculation result as a pretty JSON string
 */
export function formatSalaryCalculation(result: SalaryCalculationOutput): string {
  return JSON.stringify(result, null, 2);
}
