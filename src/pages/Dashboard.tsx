import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useHRMS } from '@/contexts/HRMSContext';
import { formatCurrency } from '@/lib/payroll-engine';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { Users, DollarSign, TrendingUp, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function Dashboard() {
  const { employees, payrollRecords } = useHRMS();

  const stats = useMemo(() => {
    const activeEmployees = employees.filter(e => e.isActive).length;
    const totalPayroll = payrollRecords.reduce((sum, p) => sum + p.netPayable, 0);
    const avgSalary = activeEmployees > 0 
      ? employees.filter(e => e.isActive).reduce((sum, e) => sum + e.grossMonthlySalary, 0) / activeEmployees 
      : 0;
    const tdsCount = payrollRecords.filter(p => p.isTDSFlagged).length;

    return { activeEmployees, totalPayroll, avgSalary, tdsCount };
  }, [employees, payrollRecords]);

  const chartData = useMemo(() => {
    // Generate sample trend data for demonstration
    const currentMonth = new Date().getMonth();
    return months.slice(0, currentMonth + 1).map((month, index) => {
      const monthPayroll = payrollRecords.filter(p => p.month === index + 1);
      const total = monthPayroll.length > 0 
        ? monthPayroll.reduce((sum, p) => sum + p.netPayable, 0)
        : employees.filter(e => e.isActive).reduce((sum, e) => sum + e.grossMonthlySalary * 0.85, 0) * (0.9 + Math.random() * 0.2);
      return {
        month,
        payout: Math.round(total),
      };
    });
  }, [payrollRecords, employees]);

  const departmentData = useMemo(() => {
    const deptMap = new Map<string, number>();
    employees.filter(e => e.isActive).forEach(emp => {
      deptMap.set(emp.department, (deptMap.get(emp.department) || 0) + 1);
    });
    return Array.from(deptMap.entries()).map(([name, count]) => ({ name, count }));
  }, [employees]);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm sm:text-base text-muted-foreground">Overview of your HRMS and payroll operations</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 sm:p-6 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              Active Employees
            </CardTitle>
            <Users className="h-4 w-4 text-primary hidden sm:block" />
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
            <div className="text-lg sm:text-2xl font-bold">{stats.activeEmployees}</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
              {employees.length} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 sm:p-6 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              Total Payroll
            </CardTitle>
            <DollarSign className="h-4 w-4 text-success hidden sm:block" />
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
            <div className="text-lg sm:text-2xl font-bold truncate">{formatCurrency(stats.totalPayroll)}</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
              {payrollRecords.length} records
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 sm:p-6 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              Avg Salary
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-accent hidden sm:block" />
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
            <div className="text-lg sm:text-2xl font-bold truncate">{formatCurrency(stats.avgSalary)}</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
              Monthly avg
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 sm:p-6 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              TDS Flagged
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-warning hidden sm:block" />
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
            <div className="text-lg sm:text-2xl font-bold">{stats.tdsCount}</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
              Above threshold
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg">Monthly Payout Trends</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Total net payable amount per month</CardDescription>
          </CardHeader>
          <CardContent className="p-2 sm:p-6 pt-0">
            <div className="h-[200px] sm:h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="month" 
                    className="text-muted-foreground text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                  />
                  <YAxis 
                    className="text-muted-foreground text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                    tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}K`}
                    width={45}
                  />
                  <Tooltip 
                    formatter={(value: number) => [formatCurrency(value), 'Payout']}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '0.5rem',
                      fontSize: '12px',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="payout"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg">Department Distribution</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Employees per department</CardDescription>
          </CardHeader>
          <CardContent className="p-2 sm:p-6 pt-0">
            <div className="h-[200px] sm:h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={departmentData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    type="number"
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                  />
                  <YAxis 
                    dataKey="name" 
                    type="category"
                    width={60}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '0.5rem',
                      fontSize: '12px',
                    }}
                  />
                  <Bar 
                    dataKey="count" 
                    fill="hsl(var(--primary))" 
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Payroll Activity */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-base sm:text-lg">Recent Payroll Records</CardTitle>
          <CardDescription className="text-xs sm:text-sm">Latest processed payroll entries</CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          {payrollRecords.length === 0 ? (
            <p className="text-muted-foreground text-center py-8 text-sm">
              No payroll records yet. Generate payroll from the Payroll Run page.
            </p>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {payrollRecords.slice(0, 5).map((record) => (
                <div
                  key={record.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg bg-muted/50 gap-2"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs sm:text-sm font-medium text-primary">
                        {record.employeeName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-sm sm:text-base">{record.employeeName}</p>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        {months[record.month - 1]} {record.year}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 pl-11 sm:pl-0">
                    <div className="text-left sm:text-right">
                      <p className="font-semibold text-sm sm:text-base">{formatCurrency(record.netPayable)}</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">Net Payable</p>
                    </div>
                    <div className="flex gap-1 sm:gap-2">
                      {record.isTDSFlagged && (
                        <Badge variant="outline" className="border-warning text-warning text-[10px] sm:text-xs px-1 sm:px-2">
                          TDS
                        </Badge>
                      )}
                      {record.isLocked && (
                        <Badge variant="secondary" className="text-[10px] sm:text-xs px-1 sm:px-2">Locked</Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
