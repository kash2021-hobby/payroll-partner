// Mock data for development

export interface MockEmployee {
  id: string;
  full_name: string;
  email: string | null;
  salary_type: 'monthly' | 'daily';
  base_amount: number;
  working_days_rule: 'calendar' | 'fixed_26';
  is_pf_enabled: boolean;
  is_esi_enabled: boolean;
  is_tds_enabled: boolean;
  department: string | null;
  position: string | null;
  status: 'active' | 'on-leave' | 'inactive';
  joining_date: string;
  created_at: string;
}

export interface MockAttendance {
  id: string;
  employee_id: string;
  date: string;
  sign_in: string | null;
  sign_out: string | null;
  status: 'present' | 'late' | 'absent' | 'on-leave';
  total_hours: number | null;
}

// Generate employee ID
let employeeCounter = 1;
export const generateEmployeeId = () => {
  const id = `EMP${String(employeeCounter).padStart(4, '0')}`;
  employeeCounter++;
  return id;
};

// Initial mock employees
export const mockEmployees: MockEmployee[] = [
  {
    id: 'EMP0001',
    full_name: 'Rajesh Kumar',
    email: 'rajesh@example.com',
    salary_type: 'monthly',
    base_amount: 45000,
    working_days_rule: 'fixed_26',
    is_pf_enabled: true,
    is_esi_enabled: false,
    is_tds_enabled: true,
    department: 'Engineering',
    position: 'Senior Developer',
    status: 'active',
    joining_date: '2023-01-15',
    created_at: '2023-01-15T00:00:00Z',
  },
  {
    id: 'EMP0002',
    full_name: 'Priya Sharma',
    email: 'priya@example.com',
    salary_type: 'monthly',
    base_amount: 35000,
    working_days_rule: 'calendar',
    is_pf_enabled: true,
    is_esi_enabled: true,
    is_tds_enabled: false,
    department: 'HR',
    position: 'HR Manager',
    status: 'active',
    joining_date: '2023-03-10',
    created_at: '2023-03-10T00:00:00Z',
  },
  {
    id: 'EMP0003',
    full_name: 'Amit Patel',
    email: 'amit@example.com',
    salary_type: 'daily',
    base_amount: 800,
    working_days_rule: 'calendar',
    is_pf_enabled: false,
    is_esi_enabled: true,
    is_tds_enabled: false,
    department: 'Operations',
    position: 'Site Supervisor',
    status: 'active',
    joining_date: '2023-06-01',
    created_at: '2023-06-01T00:00:00Z',
  },
  {
    id: 'EMP0004',
    full_name: 'Sneha Reddy',
    email: 'sneha@example.com',
    salary_type: 'monthly',
    base_amount: 28000,
    working_days_rule: 'fixed_26',
    is_pf_enabled: true,
    is_esi_enabled: true,
    is_tds_enabled: false,
    department: 'Accounts',
    position: 'Accountant',
    status: 'active',
    joining_date: '2023-08-20',
    created_at: '2023-08-20T00:00:00Z',
  },
  {
    id: 'EMP0005',
    full_name: 'Vikram Singh',
    email: 'vikram@example.com',
    salary_type: 'daily',
    base_amount: 1200,
    working_days_rule: 'calendar',
    is_pf_enabled: false,
    is_esi_enabled: false,
    is_tds_enabled: false,
    department: 'Engineering',
    position: 'Technician',
    status: 'on-leave',
    joining_date: '2024-01-05',
    created_at: '2024-01-05T00:00:00Z',
  },
];

// Generate mock attendance for current month
const generateMockAttendance = (): MockAttendance[] => {
  const attendance: MockAttendance[] = [];
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  
  mockEmployees.forEach((emp) => {
    if (emp.status === 'inactive') return;
    
    // Generate attendance for each day of the month up to today
    for (let day = 1; day <= today.getDate(); day++) {
      const date = new Date(currentYear, currentMonth, day);
      const dayOfWeek = date.getDay();
      
      // Skip Sundays
      if (dayOfWeek === 0) continue;
      
      // Random status with higher probability of present
      const rand = Math.random();
      let status: MockAttendance['status'] = 'present';
      if (rand > 0.95) status = 'absent';
      else if (rand > 0.9) status = 'late';
      else if (rand > 0.85 && emp.status === 'on-leave') status = 'on-leave';
      
      const signIn = status === 'absent' ? null : `09:${String(Math.floor(Math.random() * 30)).padStart(2, '0')}`;
      const signOut = status === 'absent' ? null : `18:${String(Math.floor(Math.random() * 30)).padStart(2, '0')}`;
      const totalHours = status === 'absent' ? null : 8 + Math.random() * 2;
      
      attendance.push({
        id: `ATT-${emp.id}-${date.toISOString().split('T')[0]}`,
        employee_id: emp.id,
        date: date.toISOString().split('T')[0],
        sign_in: signIn,
        sign_out: signOut,
        status,
        total_hours: totalHours ? Math.round(totalHours * 100) / 100 : null,
      });
    }
  });
  
  return attendance;
};

export const mockAttendance = generateMockAttendance();

// Update counter based on existing employees
employeeCounter = mockEmployees.length + 1;
