import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  employeesAPI,
  attendanceAPI,
  BackendEmployee,
  BackendAttendance,
  calculateMonthlySalary,
} from '@/lib/api-service';

// ============ EMPLOYEES HOOK ============
export function useEmployees() {
  return useQuery({
    queryKey: ['employees'],
    queryFn: employeesAPI.getAll,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useEmployee(id: string) {
  return useQuery({
    queryKey: ['employee', id],
    queryFn: () => employeesAPI.getById(id),
    enabled: !!id,
  });
}

// ============ ATTENDANCE HOOK ============
export function useAttendance() {
  return useQuery({
    queryKey: ['attendance'],
    queryFn: attendanceAPI.getAll,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// ============ PAYROLL DATA HOOK ============
export interface PayrollData {
  employeeId: string;
  employeeName: string;
  department: string;
  position: string;
  employmentType: 'hourly' | 'daily' | 'weekly';
  workRate: number;
  presentDays: number;
  totalHours: number;
  grossSalary: number;
  // Deductions (calculated on frontend based on settings)
  pfDeduction: number;
  esiDeduction: number;
  manualTDS: number;
  prevMonthAdjustment: number;
  oneTimeBonus: number;
  netPayable: number;
}

export function usePayrollData(month: number, year: number) {
  const { data: employees, isLoading: empLoading } = useEmployees();
  const { data: attendance, isLoading: attLoading } = useAttendance();

  const isLoading = empLoading || attLoading;

  // Filter attendance for the selected month/year
  const monthlyAttendance = attendance?.filter((a) => {
    const date = new Date(a.date);
    return date.getMonth() + 1 === month && date.getFullYear() === year;
  }) || [];

  // Calculate payroll for each employee
  const payrollData: PayrollData[] = (employees || [])
    .filter((emp) => emp.status === 'active')
    .map((emp) => {
      const { grossSalary, presentDays, totalHours } = calculateMonthlySalary(
        emp,
        monthlyAttendance
      );

      // Default deductions (these would be calculated based on global settings)
      const pfDeduction = grossSalary > 15000 ? Math.round(grossSalary * 0.12) : 0;
      const esiDeduction = grossSalary <= 21000 ? Math.round(grossSalary * 0.0075) : 0;

      return {
        employeeId: emp.id,
        employeeName: emp.full_name,
        department: emp.department || 'N/A',
        position: emp.position || 'N/A',
        employmentType: emp.employment_type,
        workRate: emp.work_rate,
        presentDays,
        totalHours,
        grossSalary,
        pfDeduction,
        esiDeduction,
        manualTDS: 0,
        prevMonthAdjustment: 0,
        oneTimeBonus: 0,
        netPayable: grossSalary - pfDeduction - esiDeduction,
      };
    });

  return {
    payrollData,
    isLoading,
    employees,
    attendance: monthlyAttendance,
  };
}

// ============ MUTATIONS ============
export function useCreateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<BackendEmployee>) => employeesAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });
}

export function useUpdateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<BackendEmployee> }) =>
      employeesAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });
}

export function useDeleteEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => employeesAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });
}

export function useClockIn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (employee_id: string) => attendanceAPI.clockIn(employee_id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
  });
}

export function useClockOut() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (employee_id: string) => attendanceAPI.clockOut(employee_id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
  });
}
