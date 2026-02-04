import {
  Employee,
  AttendanceRecord,
  GlobalSettings,
  PayrollCalculationInput,
  PayrollCalculationResult,
} from '@/types/hrms';

/**
 * Get the number of days in a given month/year
 */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Calculate pro-rata salary based on attendance
 * Formula: (Gross Monthly Salary / Days in Current Month) * Days Active
 */
export function calculateProRataSalary(
  grossMonthlySalary: number,
  totalDays: number,
  presentDays: number
): number {
  if (totalDays === 0) return 0;
  return (grossMonthlySalary / totalDays) * presentDays;
}

/**
 * Calculate PF deduction (typically 12% of basic, capped at ₹15,000 basic)
 */
export function calculatePFDeduction(
  proRataSalary: number,
  pfPercentage: number,
  isEnabled: boolean
): number {
  if (!isEnabled) return 0;
  // PF is typically calculated on basic (assuming basic is 50% of gross)
  const basicSalary = proRataSalary * 0.5;
  const cappedBasic = Math.min(basicSalary, 15000);
  return Math.round((cappedBasic * pfPercentage) / 100);
}

/**
 * Calculate ESI deduction (0.75% of gross, applicable if gross <= ₹21,000)
 */
export function calculateESIDeduction(
  proRataSalary: number,
  esiPercentage: number,
  isEnabled: boolean
): number {
  if (!isEnabled) return 0;
  // ESI is applicable only if gross salary is <= ₹21,000
  if (proRataSalary > 21000) return 0;
  return Math.round((proRataSalary * esiPercentage) / 100);
}

/**
 * Calculate TDS deduction and flag status
 */
export function calculateTDSDeduction(
  grossSalary: number,
  tdsThreshold: number,
  tdsPercentage: number,
  isEnabled: boolean
): { amount: number; isFlagged: boolean } {
  if (!isEnabled) return { amount: 0, isFlagged: false };
  
  const isFlagged = grossSalary > tdsThreshold;
  // Simple TDS calculation - in reality this would be more complex
  const amount = isFlagged ? Math.round((grossSalary * tdsPercentage) / 100) : 0;
  
  return { amount, isFlagged };
}

/**
 * Calculate overtime amount
 * Assuming overtime rate is 1.5x of daily rate
 */
export function calculateOvertimeAmount(
  grossMonthlySalary: number,
  totalDays: number,
  overtimeHours: number
): number {
  if (totalDays === 0 || overtimeHours === 0) return 0;
  const dailyRate = grossMonthlySalary / totalDays;
  const hourlyRate = dailyRate / 8; // Assuming 8-hour workday
  return Math.round(hourlyRate * 1.5 * overtimeHours);
}

/**
 * Main payroll calculation function
 */
export function calculatePayroll(
  input: PayrollCalculationInput
): PayrollCalculationResult {
  const { employee, attendance, previousMonthAdjustment, settings } = input;

  // Determine total days based on calculation type
  const totalDays =
    employee.monthCalculationType === 'fixed_26'
      ? 26
      : getDaysInMonth(attendance.year, attendance.month);

  // Calculate pro-rata salary
  const proRataSalary = calculateProRataSalary(
    employee.grossMonthlySalary,
    totalDays,
    attendance.presentDays
  );

  // Calculate overtime
  const overtimeAmount = calculateOvertimeAmount(
    employee.grossMonthlySalary,
    totalDays,
    attendance.overtimeHours
  );

  // One-time bonus from attendance override
  const oneTimeBonus = attendance.oneTimeSalaryOverride || 0;

  // Total earnings before deductions
  const totalEarnings =
    proRataSalary + overtimeAmount + oneTimeBonus + previousMonthAdjustment;

  // Calculate deductions
  const pfDeduction = calculatePFDeduction(
    proRataSalary,
    settings.pfPercentage,
    employee.isPFEnabled
  );

  const esiDeduction = calculateESIDeduction(
    proRataSalary,
    settings.esiPercentage,
    employee.isESIEnabled
  );

  const tdsResult = calculateTDSDeduction(
    employee.grossMonthlySalary,
    settings.tdsThreshold,
    settings.tdsPercentage,
    employee.isTDSEnabled
  );

  const totalDeductions = pfDeduction + esiDeduction + tdsResult.amount;
  const netPayable = totalEarnings - totalDeductions;

  return {
    grossSalary: employee.grossMonthlySalary,
    proRataSalary: Math.round(proRataSalary),
    overtimeAmount,
    oneTimeBonus,
    previousMonthAdjustment,
    totalEarnings: Math.round(totalEarnings),
    pfDeduction,
    esiDeduction,
    tdsDeduction: tdsResult.amount,
    totalDeductions,
    netPayable: Math.round(netPayable),
    isTDSFlagged: tdsResult.isFlagged,
  };
}

/**
 * Format currency in INR
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Parse CSV for attendance upload
 */
export function parseAttendanceCSV(csvContent: string): Array<{
  employeeId: string;
  presentDays: number;
  overtimeHours: number;
}> {
  const lines = csvContent.trim().split('\n');
  const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
  
  const employeeIdIndex = headers.findIndex(h => 
    h.includes('employee') && h.includes('id') || h === 'employeeid'
  );
  const presentDaysIndex = headers.findIndex(h => 
    h.includes('present') || h.includes('days')
  );
  const overtimeIndex = headers.findIndex(h => 
    h.includes('overtime') || h.includes('ot')
  );

  if (employeeIdIndex === -1 || presentDaysIndex === -1) {
    throw new Error('CSV must contain "Employee ID" and "Present Days" columns');
  }

  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim());
    return {
      employeeId: values[employeeIdIndex],
      presentDays: parseInt(values[presentDaysIndex]) || 0,
      overtimeHours: overtimeIndex !== -1 ? parseInt(values[overtimeIndex]) || 0 : 0,
    };
  }).filter(record => record.employeeId);
}
