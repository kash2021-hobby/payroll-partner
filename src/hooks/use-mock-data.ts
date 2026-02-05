import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  mockEmployees,
  mockAttendance,
  generateEmployeeId,
  MockEmployee,
  MockAttendance,
} from '@/lib/mock-data';

// In-memory store (simulates database)
let employees = [...mockEmployees];
let attendance = [...mockAttendance];

// ============ EMPLOYEES HOOK ============
export function useEmployees() {
  return useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 300));
      return employees;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useEmployee(id: string) {
  return useQuery({
    queryKey: ['employee', id],
    queryFn: async () => {
      await new Promise((resolve) => setTimeout(resolve, 200));
      return employees.find((e) => e.id === id) || null;
    },
    enabled: !!id,
  });
}

// ============ ATTENDANCE HOOK ============
export function useAttendance() {
  return useQuery({
    queryKey: ['attendance'],
    queryFn: async () => {
      await new Promise((resolve) => setTimeout(resolve, 300));
      return attendance;
    },
    staleTime: 2 * 60 * 1000,
  });
}

// ============ PAYROLL DATA HOOK ============
export interface PayrollData {
  employeeId: string;
  employeeName: string;
  department: string;
  position: string;
  salaryType: 'monthly' | 'daily';
  baseAmount: number;
  workingDaysRule: 'calendar' | 'fixed_26';
  presentDays: number;
  totalHours: number;
  grossSalary: number;
  pfDeduction: number;
  esiDeduction: number;
  tdsDeduction: number;
  netPayable: number;
  isPfEnabled: boolean;
  isEsiEnabled: boolean;
  isTdsEnabled: boolean;
}

export function usePayrollData(month: number, year: number) {
  const { data: employeeList, isLoading: empLoading } = useEmployees();
  const { data: attendanceList, isLoading: attLoading } = useAttendance();

  const isLoading = empLoading || attLoading;

  // Filter attendance for the selected month/year
  const monthlyAttendance = (attendanceList || []).filter((a) => {
    const date = new Date(a.date);
    return date.getMonth() + 1 === month && date.getFullYear() === year;
  });

  // Calculate payroll for each active employee
  const payrollData: PayrollData[] = (employeeList || [])
    .filter((emp) => emp.status === 'active')
    .map((emp) => {
      const empAttendance = monthlyAttendance.filter((a) => a.employee_id === emp.id);
      const presentDays = empAttendance.filter(
        (a) => a.status === 'present' || a.status === 'late'
      ).length;
      const totalHours = empAttendance.reduce((sum, a) => sum + (a.total_hours || 0), 0);

      // Calculate gross salary
      let grossSalary = 0;
      const totalDaysInMonth = emp.working_days_rule === 'fixed_26' ? 26 : 30;

      if (emp.salary_type === 'monthly') {
        grossSalary = (emp.base_amount / totalDaysInMonth) * presentDays;
      } else {
        grossSalary = presentDays * emp.base_amount;
      }

      grossSalary = Math.round(grossSalary * 100) / 100;

      // Calculate deductions based on employee settings
      const pfDeduction = emp.is_pf_enabled ? Math.round(grossSalary * 0.12) : 0;
      const esiDeduction = emp.is_esi_enabled && grossSalary <= 21000 ? Math.round(grossSalary * 0.0075) : 0;
      const tdsDeduction = emp.is_td_enabled ? Math.round(grossSalary * 0.1) : 0; // 10% TDS placeholder

      return {
        employeeId: emp.id,
        employeeName: emp.full_name,
        department: emp.department || 'N/A',
        position: emp.position || 'N/A',
        salaryType: emp.salary_type,
        baseAmount: emp.base_amount,
        workingDaysRule: emp.working_days_rule,
        presentDays,
        totalHours: Math.round(totalHours * 100) / 100,
        grossSalary,
        pfDeduction,
        esiDeduction,
        tdsDeduction,
        netPayable: grossSalary - pfDeduction - esiDeduction - tdsDeduction,
        isPfEnabled: emp.is_pf_enabled,
        isEsiEnabled: emp.is_esi_enabled,
        isTdsEnabled: emp.is_td_enabled,
      };
    });

  return {
    payrollData,
    isLoading,
    employees: employeeList,
    attendance: monthlyAttendance,
  };
}

// ============ MUTATIONS ============
export function useCreateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<MockEmployee>) => {
      await new Promise((resolve) => setTimeout(resolve, 300));
      const newEmployee: MockEmployee = {
        id: generateEmployeeId(),
        full_name: data.full_name || '',
        email: data.email || null,
        salary_type: data.salary_type || 'monthly',
        base_amount: data.base_amount || 0,
        working_days_rule: data.working_days_rule || 'calendar',
        is_pf_enabled: data.is_pf_enabled || false,
        is_esi_enabled: data.is_esi_enabled || false,
        is_td_enabled: data.is_td_enabled || false,
        department: data.department || null,
        position: data.position || null,
        status: 'active',
        joining_date: new Date().toISOString().split('T')[0],
        created_at: new Date().toISOString(),
      };
      employees = [...employees, newEmployee];
      return newEmployee;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });
}

export function useUpdateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<MockEmployee> }) => {
      await new Promise((resolve) => setTimeout(resolve, 300));
      employees = employees.map((emp) =>
        emp.id === id ? { ...emp, ...data } : emp
      );
      return employees.find((e) => e.id === id)!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });
}

export function useDeleteEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await new Promise((resolve) => setTimeout(resolve, 300));
      employees = employees.filter((emp) => emp.id !== id);
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });
}

export function useClockIn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (employee_id: string) => {
      await new Promise((resolve) => setTimeout(resolve, 300));
      const today = new Date().toISOString().split('T')[0];
      const newAttendance: MockAttendance = {
        id: `ATT-${employee_id}-${today}`,
        employee_id,
        date: today,
        sign_in: new Date().toTimeString().slice(0, 5),
        sign_out: null,
        status: 'present',
        total_hours: null,
      };
      attendance = [...attendance, newAttendance];
      return newAttendance;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
  });
}

export function useClockOut() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (employee_id: string) => {
      await new Promise((resolve) => setTimeout(resolve, 300));
      const today = new Date().toISOString().split('T')[0];
      attendance = attendance.map((att) => {
        if (att.employee_id === employee_id && att.date === today && !att.sign_out) {
          const signOut = new Date().toTimeString().slice(0, 5);
          const signInTime = att.sign_in ? att.sign_in.split(':').map(Number) : [9, 0];
          const signOutTime = signOut.split(':').map(Number);
          const hours =
            signOutTime[0] - signInTime[0] + (signOutTime[1] - signInTime[1]) / 60;
          return {
            ...att,
            sign_out: signOut,
            total_hours: Math.round(hours * 100) / 100,
          };
        }
        return att;
      });
      return attendance.find((a) => a.employee_id === employee_id && a.date === today)!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
  });
}

// Re-export types
export type { MockEmployee, MockAttendance };
