// API Service to connect to Hostinger MySQL backend

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://your-backend-url.com';

// Auth token management
let authToken: string | null = localStorage.getItem('auth_token');

export const setAuthToken = (token: string) => {
  authToken = token;
  localStorage.setItem('auth_token', token);
};

export const clearAuthToken = () => {
  authToken = null;
  localStorage.removeItem('auth_token');
};

const getHeaders = () => ({
  'Content-Type': 'application/json',
  ...(authToken && { Authorization: `Bearer ${authToken}` }),
});

// Generic fetch wrapper
async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      ...getHeaders(),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// ============ AUTH ============
export const authAPI = {
  login: (email: string, password: string) =>
    apiRequest<{ message: string; token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (email: string, password: string) =>
    apiRequest<{ message: string; adminId: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
};

// ============ EMPLOYEES ============
export interface BackendEmployee {
  id: string;
  full_name: string;
  email: string | null;
  dob: string | null;
  joining_date: string;
  employment_type: 'hourly' | 'daily' | 'weekly';
  work_rate: number;
  position: string | null;
  department: string | null;
  shift: 'morning' | 'evening' | 'night' | 'custom' | null;
  phone: string | null;
  allowed_leaves: number;
  taken_leaves: number;
  status: 'active' | 'on-leave' | 'inactive';
  created_at: string;
}

export const employeesAPI = {
  getAll: () => apiRequest<BackendEmployee[]>('/api/employees'),
  
  getById: (id: string) => apiRequest<BackendEmployee>(`/api/employees/${id}`),
  
  create: (data: Partial<BackendEmployee>) =>
    apiRequest<{ message: string; data: BackendEmployee }>('/api/employees', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<BackendEmployee>) =>
    apiRequest<{ message: string; data: BackendEmployee }>(`/api/employees/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    apiRequest<{ message: string }>(`/api/employees/${id}`, {
      method: 'DELETE',
    }),
};

// ============ ATTENDANCE ============
export interface BackendAttendance {
  id: string;
  employee_id: string;
  date: string;
  sign_in: string | null;
  sign_out: string | null;
  status: 'present' | 'late' | 'absent' | 'on-leave';
  total_hours: number | null;
  created_at: string;
  Employee?: {
    full_name: string;
    position: string | null;
    department: string | null;
  };
}

export const attendanceAPI = {
  getAll: () => apiRequest<BackendAttendance[]>('/api/attendance'),

  clockIn: (employee_id: string) =>
    apiRequest<{ message: string; data: BackendAttendance }>('/api/attendance/clock-in', {
      method: 'POST',
      body: JSON.stringify({ employee_id }),
    }),

  clockOut: (employee_id: string) =>
    apiRequest<{ message: string; total_hours: string; data: BackendAttendance }>(
      '/api/attendance/clock-out',
      {
        method: 'PUT',
        body: JSON.stringify({ employee_id }),
      }
    ),
};

// ============ LEAVES ============
export interface BackendLeaveRequest {
  id: string;
  employee_id: string;
  leave_type: 'planned' | 'happy' | 'medical';
  start_date: string;
  end_date: string;
  reason: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  Employee?: {
    full_name: string;
    department: string | null;
    position: string | null;
  };
}

export const leavesAPI = {
  getAll: () => apiRequest<BackendLeaveRequest[]>('/api/leaves'),

  create: (data: {
    employee_id: string;
    leave_type: string;
    start_date: string;
    end_date: string;
    reason?: string;
  }) =>
    apiRequest<{ message: string; data: BackendLeaveRequest }>('/api/leaves', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateStatus: (id: string, status: 'approved' | 'rejected') =>
    apiRequest<{ message: string; data: BackendLeaveRequest }>(`/api/leaves/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    }),
};

// ============ HOLIDAYS ============
export interface BackendHoliday {
  id: string;
  name: string;
  date: string;
  description: string | null;
  created_at: string;
}

export const holidaysAPI = {
  getAll: () => apiRequest<BackendHoliday[]>('/api/holidays'),

  create: (data: { name: string; date: string; description?: string }) =>
    apiRequest<{ message: string; data: BackendHoliday }>('/api/holidays', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<BackendHoliday>) =>
    apiRequest<{ message: string; data: BackendHoliday }>(`/api/holidays/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    apiRequest<{ message: string }>(`/api/holidays/${id}`, {
      method: 'DELETE',
    }),
};

// ============ BREAKS ============
export interface BackendBreakRecord {
  id: string;
  employee_id: string;
  date: string;
  start_time: string;
  end_time: string | null;
  duration_minutes: number | null;
  type: string;
  Employee?: {
    full_name: string;
  };
}

export const breaksAPI = {
  getAll: () => apiRequest<BackendBreakRecord[]>('/api/breaks'),

  startBreak: (employee_id: string, type?: string) =>
    apiRequest<{ message: string; data: BackendBreakRecord }>('/api/attendance/break/start', {
      method: 'POST',
      body: JSON.stringify({ employee_id, type }),
    }),

  endBreak: (employee_id: string) =>
    apiRequest<{ message: string; duration_minutes: number; data: BackendBreakRecord }>(
      '/api/attendance/break/end',
      {
        method: 'PUT',
        body: JSON.stringify({ employee_id }),
      }
    ),
};

// ============ SALARY CALCULATION HELPERS ============
export const calculateMonthlySalary = (
  employee: BackendEmployee,
  attendance: BackendAttendance[]
): { grossSalary: number; presentDays: number; totalHours: number } => {
  // Filter attendance for this employee
  const empAttendance = attendance.filter((a) => a.employee_id === employee.id);

  const presentDays = empAttendance.filter((a) => a.status === 'present' || a.status === 'late').length;
  const totalHours = empAttendance.reduce((sum, a) => sum + (a.total_hours || 0), 0);

  let grossSalary = 0;

  switch (employee.employment_type) {
    case 'hourly':
      grossSalary = totalHours * employee.work_rate;
      break;
    case 'daily':
      grossSalary = presentDays * employee.work_rate;
      break;
    case 'weekly':
      // Assuming 6 working days per week
      const weeks = presentDays / 6;
      grossSalary = weeks * employee.work_rate;
      break;
  }

  return {
    grossSalary: Math.round(grossSalary * 100) / 100,
    presentDays,
    totalHours,
  };
};
