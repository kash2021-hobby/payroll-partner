 import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
 import {
   employeesAPI,
   attendanceAPI,
   BackendEmployee,
   BackendAttendance,
 } from '@/lib/api-service';
 
 // Re-export backend types with aliases for compatibility
 export type MockEmployee = BackendEmployee;
 export type MockAttendance = BackendAttendance;
 
 // ============ EMPLOYEES HOOK ============
 export function useEmployees() {
   return useQuery({
     queryKey: ['employees'],
     queryFn: employeesAPI.getAll,
     staleTime: 5 * 60 * 1000,
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
     staleTime: 2 * 60 * 1000,
   });
 }
 
 // ============ PAYROLL DATA HOOK ============
 export interface PayrollData {
   employeeId: string;
   employeeName: string;
   department: string;
   position: string;
   employmentType: 'hourly' | 'daily' | 'weekly' | 'monthly';
   workRate: number;
   monthCalculationType: 'calendar' | 'fixed_26';
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
 
       // Calculate gross salary based on employment type
       let grossSalary = 0;
       const totalDaysInMonth = emp.month_calculation_type === 'fixed_26' ? 26 : 30;
 
       switch (emp.employment_type) {
         case 'monthly':
           grossSalary = (emp.work_rate / totalDaysInMonth) * presentDays;
           break;
         case 'daily':
           grossSalary = presentDays * emp.work_rate;
           break;
         case 'hourly':
           grossSalary = totalHours * emp.work_rate;
           break;
         case 'weekly':
           const weeks = presentDays / 6;
           grossSalary = weeks * emp.work_rate;
           break;
       }
 
       grossSalary = Math.round(grossSalary * 100) / 100;
 
       // Calculate deductions based on employee settings
       const pfDeduction = emp.is_pf_enabled ? Math.round(grossSalary * 0.12) : 0;
       const esiDeduction = emp.is_esi_enabled && grossSalary <= 21000 ? Math.round(grossSalary * 0.0075) : 0;
       const tdsDeduction = emp.is_tds_enabled ? Math.round(grossSalary * 0.1) : 0;
 
       return {
         employeeId: emp.id,
         employeeName: emp.full_name,
         department: emp.department || 'N/A',
         position: emp.position || 'N/A',
         employmentType: emp.employment_type,
         workRate: emp.work_rate,
         monthCalculationType: emp.month_calculation_type || 'calendar',
         presentDays,
         totalHours: Math.round(totalHours * 100) / 100,
         grossSalary,
         pfDeduction,
         esiDeduction,
         tdsDeduction,
         netPayable: grossSalary - pfDeduction - esiDeduction - tdsDeduction,
         isPfEnabled: emp.is_pf_enabled ?? false,
         isEsiEnabled: emp.is_esi_enabled ?? false,
         isTdsEnabled: emp.is_tds_enabled ?? false,
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
     mutationFn: async (data: Partial<BackendEmployee>) => {
       const result = await employeesAPI.create(data);
       return result.data;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['employees'] });
     },
   });
 }
 
 export function useUpdateEmployee() {
   const queryClient = useQueryClient();
 
   return useMutation({
     mutationFn: async ({ id, data }: { id: string; data: Partial<BackendEmployee> }) => {
       const result = await employeesAPI.update(id, data);
       return result.data;
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
       await employeesAPI.delete(id);
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
       const result = await attendanceAPI.clockIn(employee_id);
       return result.data;
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
       const result = await attendanceAPI.clockOut(employee_id);
       return result.data;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['attendance'] });
     },
   });
 }