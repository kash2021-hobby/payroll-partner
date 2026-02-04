import { Employee } from '@/types/hrms';

/**
 * Parsed attendance record from CSV
 */
export interface ParsedAttendanceRecord {
  employeeCode: string;
  daysPresent: number;
  rowNumber: number;
}

/**
 * Validation result for a single record
 */
export interface AttendanceValidationResult {
  isValid: boolean;
  employeeCode: string;
  employeeId?: string;
  employeeName?: string;
  daysPresent: number;
  rowNumber: number;
  error?: string;
}

/**
 * Complete result from CSV parsing and validation
 */
export interface AttendanceCSVResult {
  success: boolean;
  totalRows: number;
  validRecords: AttendanceValidationResult[];
  invalidRecords: AttendanceValidationResult[];
  errors: string[];
  summary: {
    processed: number;
    valid: number;
    invalid: number;
  };
}

/**
 * Parse CSV content into raw records
 * Expected columns: Employee_Code, Days_Present
 */
export function parseAttendanceCSV(csvContent: string): {
  records: ParsedAttendanceRecord[];
  errors: string[];
} {
  const errors: string[] = [];
  const records: ParsedAttendanceRecord[] = [];

  // Normalize line endings and split
  const lines = csvContent
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim()
    .split('\n');

  if (lines.length < 2) {
    errors.push('CSV file must contain a header row and at least one data row');
    return { records, errors };
  }

  // Parse header row
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
  
  // Find column indices
  const employeeCodeIndex = headers.findIndex(h => 
    h === 'employee_code' || 
    h === 'employeecode' || 
    h === 'emp_code' || 
    h === 'empcode' ||
    h === 'employee_id' ||
    h === 'employeeid' ||
    h === 'emp_id'
  );
  
  const daysPresentIndex = headers.findIndex(h => 
    h === 'days_present' || 
    h === 'dayspresent' || 
    h === 'present_days' || 
    h === 'presentdays' ||
    h === 'days' ||
    h === 'present'
  );

  // Validate required columns exist
  if (employeeCodeIndex === -1) {
    errors.push('Missing required column: Employee_Code (or similar: emp_code, employee_id)');
  }
  if (daysPresentIndex === -1) {
    errors.push('Missing required column: Days_Present (or similar: present_days, days)');
  }

  if (errors.length > 0) {
    return { records, errors };
  }

  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue; // Skip empty lines

    const rowNumber = i + 1; // 1-indexed for user-friendly messages
    const values = parseCSVLine(line);

    // Validate row has enough columns
    if (values.length <= Math.max(employeeCodeIndex, daysPresentIndex)) {
      errors.push(`Row ${rowNumber}: Insufficient columns`);
      continue;
    }

    const employeeCode = values[employeeCodeIndex].trim().replace(/['"]/g, '');
    const daysPresentRaw = values[daysPresentIndex].trim().replace(/['"]/g, '');

    // Validate employee code
    if (!employeeCode) {
      errors.push(`Row ${rowNumber}: Employee_Code is empty`);
      continue;
    }

    // Validate days present is a number
    const daysPresent = parseInt(daysPresentRaw, 10);
    if (isNaN(daysPresent)) {
      errors.push(`Row ${rowNumber}: Days_Present '${daysPresentRaw}' is not a valid number`);
      continue;
    }

    // Validate days present is within range
    if (daysPresent < 0) {
      errors.push(`Row ${rowNumber}: Days_Present cannot be negative`);
      continue;
    }

    if (daysPresent > 31) {
      errors.push(`Row ${rowNumber}: Days_Present cannot exceed 31`);
      continue;
    }

    records.push({
      employeeCode,
      daysPresent,
      rowNumber,
    });
  }

  return { records, errors };
}

/**
 * Parse a single CSV line handling quoted values
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"' && inQuotes && nextChar === '"') {
      // Escaped quote
      current += '"';
      i++;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current);
  return result;
}

/**
 * Validate parsed records against the employee database
 */
export function validateAttendanceRecords(
  parsedRecords: ParsedAttendanceRecord[],
  employees: Employee[],
  maxDaysInMonth: number = 31
): AttendanceValidationResult[] {
  const results: AttendanceValidationResult[] = [];

  // Create a lookup map for faster matching
  const employeeMap = new Map<string, Employee>();
  employees.forEach(emp => {
    // Map by employee code (case-insensitive)
    employeeMap.set(emp.employeeId.toLowerCase(), emp);
  });

  for (const record of parsedRecords) {
    const lookupKey = record.employeeCode.toLowerCase();
    const employee = employeeMap.get(lookupKey);

    if (!employee) {
      // Employee not found in database
      results.push({
        isValid: false,
        employeeCode: record.employeeCode,
        daysPresent: record.daysPresent,
        rowNumber: record.rowNumber,
        error: `Employee [${record.employeeCode}] not found`,
      });
      continue;
    }

    // Check if employee is active
    if (!employee.isActive) {
      results.push({
        isValid: false,
        employeeCode: record.employeeCode,
        employeeId: employee.id,
        employeeName: `${employee.firstName} ${employee.lastName}`,
        daysPresent: record.daysPresent,
        rowNumber: record.rowNumber,
        error: `Employee [${record.employeeCode}] is inactive`,
      });
      continue;
    }

    // Validate days present against month limit
    const employeeMaxDays = employee.monthCalculationType === 'fixed_26' ? 26 : maxDaysInMonth;
    if (record.daysPresent > employeeMaxDays) {
      results.push({
        isValid: false,
        employeeCode: record.employeeCode,
        employeeId: employee.id,
        employeeName: `${employee.firstName} ${employee.lastName}`,
        daysPresent: record.daysPresent,
        rowNumber: record.rowNumber,
        error: `Days_Present (${record.daysPresent}) exceeds maximum (${employeeMaxDays}) for Employee [${record.employeeCode}]`,
      });
      continue;
    }

    // Valid record
    results.push({
      isValid: true,
      employeeCode: record.employeeCode,
      employeeId: employee.id,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      daysPresent: record.daysPresent,
      rowNumber: record.rowNumber,
    });
  }

  return results;
}

/**
 * Main function: Parse and validate attendance CSV against employee database
 */
export function processAttendanceCSV(
  csvContent: string,
  employees: Employee[],
  maxDaysInMonth: number = 31
): AttendanceCSVResult {
  // Step 1: Parse the CSV
  const { records: parsedRecords, errors: parseErrors } = parseAttendanceCSV(csvContent);

  // If parsing failed completely, return early
  if (parsedRecords.length === 0 && parseErrors.length > 0) {
    return {
      success: false,
      totalRows: 0,
      validRecords: [],
      invalidRecords: [],
      errors: parseErrors,
      summary: {
        processed: 0,
        valid: 0,
        invalid: 0,
      },
    };
  }

  // Step 2: Validate against employee database
  const validationResults = validateAttendanceRecords(parsedRecords, employees, maxDaysInMonth);

  // Step 3: Separate valid and invalid records
  const validRecords = validationResults.filter(r => r.isValid);
  const invalidRecords = validationResults.filter(r => !r.isValid);

  // Compile all errors
  const allErrors = [
    ...parseErrors,
    ...invalidRecords.map(r => r.error!),
  ];

  return {
    success: invalidRecords.length === 0 && parseErrors.length === 0,
    totalRows: parsedRecords.length,
    validRecords,
    invalidRecords,
    errors: allErrors,
    summary: {
      processed: parsedRecords.length,
      valid: validRecords.length,
      invalid: invalidRecords.length,
    },
  };
}

/**
 * Generate a sample CSV template
 */
export function generateSampleCSV(): string {
  return `Employee_Code,Days_Present
EMP001,26
EMP002,24
EMP003,22
EMP004,25`;
}

/**
 * Format validation result as a human-readable report
 */
export function formatValidationReport(result: AttendanceCSVResult): string {
  const lines: string[] = [];
  
  lines.push('=== ATTENDANCE CSV VALIDATION REPORT ===');
  lines.push('');
  lines.push(`Total Rows Processed: ${result.summary.processed}`);
  lines.push(`Valid Records: ${result.summary.valid}`);
  lines.push(`Invalid Records: ${result.summary.invalid}`);
  lines.push(`Status: ${result.success ? 'SUCCESS' : 'FAILED'}`);
  
  if (result.errors.length > 0) {
    lines.push('');
    lines.push('--- ERRORS ---');
    result.errors.forEach((error, index) => {
      lines.push(`${index + 1}. ${error}`);
    });
  }

  if (result.validRecords.length > 0) {
    lines.push('');
    lines.push('--- VALID RECORDS ---');
    result.validRecords.forEach(record => {
      lines.push(`✓ ${record.employeeCode} (${record.employeeName}): ${record.daysPresent} days`);
    });
  }

  return lines.join('\n');
}
