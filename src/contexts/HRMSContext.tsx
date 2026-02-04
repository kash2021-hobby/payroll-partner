import React, { createContext, useContext, useState, useCallback } from 'react';
import {
  Employee,
  AttendanceRecord,
  PayrollRecord,
  AuditLog,
  GlobalSettings,
  User,
  UserRole,
} from '@/types/hrms';
import { calculatePayroll } from '@/lib/payroll-engine';

interface HRMSContextType {
  // Current user
  currentUser: User;
  setCurrentUser: (user: User) => void;

  // Employees
  employees: Employee[];
  addEmployee: (employee: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateEmployee: (id: string, updates: Partial<Employee>) => void;
  deleteEmployee: (id: string) => void;

  // Attendance
  attendanceRecords: AttendanceRecord[];
  addAttendanceRecord: (record: Omit<AttendanceRecord, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateAttendanceRecord: (id: string, updates: Partial<AttendanceRecord>) => void;
  bulkUpdateAttendance: (records: Array<{ employeeId: string; presentDays: number; overtimeHours: number }>, month: number, year: number) => void;

  // Payroll
  payrollRecords: PayrollRecord[];
  generatePayroll: (month: number, year: number) => void;
  lockPayroll: (id: string) => void;
  updatePayrollAdjustment: (id: string, adjustment: number) => void;

  // Settings
  globalSettings: GlobalSettings;
  updateSettings: (settings: Partial<GlobalSettings>) => void;

  // Audit
  auditLogs: AuditLog[];

  // Helpers
  hasPermission: (action: 'edit' | 'lock' | 'settings') => boolean;
}

const defaultSettings: GlobalSettings = {
  pfPercentage: 12,
  esiPercentage: 0.75,
  tdsThreshold: 50000,
  tdsPercentage: 10,
  defaultMonthCalculationType: 'calendar',
};

const defaultUser: User = {
  id: '1',
  name: 'Admin User',
  email: 'admin@company.com',
  role: 'super_admin',
};

// Sample employees for demo
const sampleEmployees: Employee[] = [
  {
    id: '1',
    employeeId: 'EMP001',
    firstName: 'Rahul',
    lastName: 'Sharma',
    email: 'rahul.sharma@company.com',
    department: 'Engineering',
    designation: 'Senior Developer',
    dateOfJoining: new Date('2022-03-15'),
    grossMonthlySalary: 75000,
    salaryType: 'monthly',
    monthCalculationType: 'calendar',
    isPFEnabled: true,
    isESIEnabled: false,
    isTDSEnabled: true,
    bankAccountNumber: '1234567890',
    bankName: 'HDFC Bank',
    ifscCode: 'HDFC0001234',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '2',
    employeeId: 'EMP002',
    firstName: 'Priya',
    lastName: 'Patel',
    email: 'priya.patel@company.com',
    department: 'HR',
    designation: 'HR Manager',
    dateOfJoining: new Date('2021-06-01'),
    grossMonthlySalary: 65000,
    salaryType: 'monthly',
    monthCalculationType: 'calendar',
    isPFEnabled: true,
    isESIEnabled: false,
    isTDSEnabled: true,
    bankAccountNumber: '0987654321',
    bankName: 'ICICI Bank',
    ifscCode: 'ICIC0005678',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '3',
    employeeId: 'EMP003',
    firstName: 'Amit',
    lastName: 'Kumar',
    email: 'amit.kumar@company.com',
    department: 'Operations',
    designation: 'Operations Lead',
    dateOfJoining: new Date('2023-01-10'),
    grossMonthlySalary: 45000,
    salaryType: 'monthly',
    monthCalculationType: 'fixed_26',
    isPFEnabled: true,
    isESIEnabled: true,
    isTDSEnabled: false,
    bankAccountNumber: '1122334455',
    bankName: 'SBI',
    ifscCode: 'SBIN0001234',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '4',
    employeeId: 'EMP004',
    firstName: 'Sneha',
    lastName: 'Reddy',
    email: 'sneha.reddy@company.com',
    department: 'Finance',
    designation: 'Accountant',
    dateOfJoining: new Date('2022-08-20'),
    grossMonthlySalary: 55000,
    salaryType: 'monthly',
    monthCalculationType: 'calendar',
    isPFEnabled: true,
    isESIEnabled: false,
    isTDSEnabled: true,
    bankAccountNumber: '5566778899',
    bankName: 'Axis Bank',
    ifscCode: 'UTIB0001234',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const HRMSContext = createContext<HRMSContextType | undefined>(undefined);

export function HRMSProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User>(defaultUser);
  const [employees, setEmployees] = useState<Employee[]>(sampleEmployees);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings>(defaultSettings);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  const addAuditLog = useCallback((
    action: string,
    entityType: AuditLog['entityType'],
    entityId: string,
    previousValue?: string,
    newValue?: string
  ) => {
    const log: AuditLog = {
      id: crypto.randomUUID(),
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action,
      entityType,
      entityId,
      previousValue,
      newValue,
      timestamp: new Date(),
    };
    setAuditLogs(prev => [log, ...prev]);
  }, [currentUser]);

  const hasPermission = useCallback((action: 'edit' | 'lock' | 'settings'): boolean => {
    if (currentUser.role === 'super_admin') return true;
    if (currentUser.role === 'payroll_operator' && action === 'edit') return true;
    return false;
  }, [currentUser.role]);

  const addEmployee = useCallback((employee: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newEmployee: Employee = {
      ...employee,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setEmployees(prev => [...prev, newEmployee]);
    addAuditLog('Created employee', 'employee', newEmployee.id, undefined, JSON.stringify(newEmployee));
  }, [addAuditLog]);

  const updateEmployee = useCallback((id: string, updates: Partial<Employee>) => {
    setEmployees(prev => prev.map(emp => {
      if (emp.id === id) {
        const updated = { ...emp, ...updates, updatedAt: new Date() };
        addAuditLog('Updated employee', 'employee', id, JSON.stringify(emp), JSON.stringify(updated));
        return updated;
      }
      return emp;
    }));
  }, [addAuditLog]);

  const deleteEmployee = useCallback((id: string) => {
    const employee = employees.find(e => e.id === id);
    setEmployees(prev => prev.filter(emp => emp.id !== id));
    if (employee) {
      addAuditLog('Deleted employee', 'employee', id, JSON.stringify(employee), undefined);
    }
  }, [employees, addAuditLog]);

  const addAttendanceRecord = useCallback((record: Omit<AttendanceRecord, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newRecord: AttendanceRecord = {
      ...record,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setAttendanceRecords(prev => [...prev, newRecord]);
    addAuditLog('Added attendance', 'attendance', newRecord.id);
  }, [addAuditLog]);

  const updateAttendanceRecord = useCallback((id: string, updates: Partial<AttendanceRecord>) => {
    setAttendanceRecords(prev => prev.map(rec => {
      if (rec.id === id) {
        return { ...rec, ...updates, updatedAt: new Date() };
      }
      return rec;
    }));
    addAuditLog('Updated attendance', 'attendance', id);
  }, [addAuditLog]);

  const bulkUpdateAttendance = useCallback((
    records: Array<{ employeeId: string; presentDays: number; overtimeHours: number }>,
    month: number,
    year: number
  ) => {
    const totalDays = new Date(year, month, 0).getDate();
    
    records.forEach(record => {
      const existing = attendanceRecords.find(
        a => a.employeeId === record.employeeId && a.month === month && a.year === year
      );

      if (existing) {
        updateAttendanceRecord(existing.id, {
          presentDays: record.presentDays,
          overtimeHours: record.overtimeHours,
        });
      } else {
        addAttendanceRecord({
          employeeId: record.employeeId,
          month,
          year,
          presentDays: record.presentDays,
          totalDays,
          overtimeHours: record.overtimeHours,
        });
      }
    });
  }, [attendanceRecords, updateAttendanceRecord, addAttendanceRecord]);

  const generatePayroll = useCallback((month: number, year: number) => {
    const totalDays = new Date(year, month, 0).getDate();
    const newRecords: PayrollRecord[] = [];

    employees.filter(emp => emp.isActive).forEach(employee => {
      let attendance = attendanceRecords.find(
        a => a.employeeId === employee.id && a.month === month && a.year === year
      );

      // Create default attendance if not exists
      if (!attendance) {
        attendance = {
          id: crypto.randomUUID(),
          employeeId: employee.id,
          month,
          year,
          presentDays: totalDays,
          totalDays,
          overtimeHours: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      }

      const existingPayroll = payrollRecords.find(
        p => p.employeeId === employee.id && p.month === month && p.year === year
      );

      const result = calculatePayroll({
        employee,
        attendance,
        previousMonthAdjustment: existingPayroll?.previousMonthAdjustment || 0,
        settings: globalSettings,
      });

      const payrollRecord: PayrollRecord = {
        id: existingPayroll?.id || crypto.randomUUID(),
        employeeId: employee.id,
        employeeName: `${employee.firstName} ${employee.lastName}`,
        month,
        year,
        presentDays: attendance.presentDays,
        totalDays: employee.monthCalculationType === 'fixed_26' ? 26 : totalDays,
        ...result,
        otherDeductions: 0,
        isLocked: existingPayroll?.isLocked || false,
        lockedBy: existingPayroll?.lockedBy,
        lockedAt: existingPayroll?.lockedAt,
        createdAt: existingPayroll?.createdAt || new Date(),
        updatedAt: new Date(),
      };

      newRecords.push(payrollRecord);
    });

    setPayrollRecords(prev => {
      const filtered = prev.filter(
        p => !(p.month === month && p.year === year)
      );
      return [...filtered, ...newRecords];
    });

    addAuditLog('Generated payroll', 'payroll', `${month}-${year}`);
  }, [employees, attendanceRecords, payrollRecords, globalSettings, addAuditLog]);

  const lockPayroll = useCallback((id: string) => {
    if (!hasPermission('lock')) return;
    
    setPayrollRecords(prev => prev.map(rec => {
      if (rec.id === id) {
        return {
          ...rec,
          isLocked: true,
          lockedBy: currentUser.name,
          lockedAt: new Date(),
          updatedAt: new Date(),
        };
      }
      return rec;
    }));
    addAuditLog('Locked payroll record', 'payroll', id);
  }, [hasPermission, currentUser.name, addAuditLog]);

  const updatePayrollAdjustment = useCallback((id: string, adjustment: number) => {
    setPayrollRecords(prev => prev.map(rec => {
      if (rec.id === id && !rec.isLocked) {
        const employee = employees.find(e => e.id === rec.employeeId);
        const attendance = attendanceRecords.find(
          a => a.employeeId === rec.employeeId && a.month === rec.month && a.year === rec.year
        );

        if (employee && attendance) {
          const result = calculatePayroll({
            employee,
            attendance,
            previousMonthAdjustment: adjustment,
            settings: globalSettings,
          });

          return {
            ...rec,
            previousMonthAdjustment: adjustment,
            ...result,
            updatedAt: new Date(),
          };
        }
      }
      return rec;
    }));
    addAuditLog('Updated payroll adjustment', 'payroll', id);
  }, [employees, attendanceRecords, globalSettings, addAuditLog]);

  const updateSettings = useCallback((settings: Partial<GlobalSettings>) => {
    if (!hasPermission('settings')) return;
    
    setGlobalSettings(prev => {
      const updated = { ...prev, ...settings };
      addAuditLog('Updated global settings', 'settings', 'global', JSON.stringify(prev), JSON.stringify(updated));
      return updated;
    });
  }, [hasPermission, addAuditLog]);

  return (
    <HRMSContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        employees,
        addEmployee,
        updateEmployee,
        deleteEmployee,
        attendanceRecords,
        addAttendanceRecord,
        updateAttendanceRecord,
        bulkUpdateAttendance,
        payrollRecords,
        generatePayroll,
        lockPayroll,
        updatePayrollAdjustment,
        globalSettings,
        updateSettings,
        auditLogs,
        hasPermission,
      }}
    >
      {children}
    </HRMSContext.Provider>
  );
}

export function useHRMS() {
  const context = useContext(HRMSContext);
  if (!context) {
    throw new Error('useHRMS must be used within HRMSProvider');
  }
  return context;
}
