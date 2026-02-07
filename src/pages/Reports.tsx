import { useMemo, useState } from 'react';
import { useHRMS } from '@/contexts/HRMSContext';
import { formatCurrency } from '@/lib/payroll-engine';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SalaryCalculator } from '@/components/SalaryCalculator';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from 'recharts';

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const COLORS = ['hsl(217, 91%, 60%)', 'hsl(199, 89%, 48%)', 'hsl(142, 76%, 36%)', 'hsl(38, 92%, 50%)', 'hsl(0, 84%, 60%)'];

export default function Reports() {
  const { employees, payrollRecords } = useHRMS();

  const monthlyTrend = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return months.map((month, index) => {
      const monthPayroll = payrollRecords.filter(
        p => p.month === index + 1 && p.year === currentYear
      );
      return {
        month,
        payout: monthPayroll.reduce((sum, p) => sum + p.netPayable, 0),
        deductions: monthPayroll.reduce((sum, p) => sum + p.totalDeductions, 0),
        gross: monthPayroll.reduce((sum, p) => sum + p.grossSalary, 0),
      };
    });
  }, [payrollRecords]);

  const departmentBreakdown = useMemo(() => {
    const deptMap = new Map<string, { total: number; count: number }>();
    employees.filter(e => e.isActive).forEach(emp => {
      const current = deptMap.get(emp.department) || { total: 0, count: 0 };
      deptMap.set(emp.department, {
        total: current.total + emp.grossMonthlySalary,
        count: current.count + 1,
      });
    });
    return Array.from(deptMap.entries()).map(([name, data]) => ({
      name,
      value: data.total,
      count: data.count,
    }));
  }, [employees]);

  const deductionBreakdown = useMemo(() => {
    const totals = payrollRecords.reduce(
      (acc, p) => ({
        pf: acc.pf + p.pfDeduction,
        esi: acc.esi + p.esiDeduction,
        tds: acc.tds + p.tdsDeduction,
      }),
      { pf: 0, esi: 0, tds: 0 }
    );
    return [
      { name: 'PF', value: totals.pf },
      { name: 'ESI', value: totals.esi },
      { name: 'TDS', value: totals.tds },
    ].filter(d => d.value > 0);
  }, [payrollRecords]);

  const salaryDistribution = useMemo(() => {
    const ranges = [
      { range: '< 30K', min: 0, max: 30000, count: 0 },
      { range: '30K-50K', min: 30000, max: 50000, count: 0 },
      { range: '50K-75K', min: 50000, max: 75000, count: 0 },
      { range: '75K-100K', min: 75000, max: 100000, count: 0 },
      { range: '> 100K', min: 100000, max: Infinity, count: 0 },
    ];
    
    employees.filter(e => e.isActive).forEach(emp => {
      const range = ranges.find(r => emp.grossMonthlySalary >= r.min && emp.grossMonthlySalary < r.max);
      if (range) range.count++;
    });
    
    return ranges;
  }, [employees]);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Reports & Calculator</h1>
        <p className="text-sm text-muted-foreground">Analytics, insights, and salary calculation tools</p>
      </div>

      <Tabs defaultValue="calculator" className="space-y-4 sm:space-y-6">
        <TabsList className="w-full sm:w-auto grid grid-cols-2 sm:inline-flex">
          <TabsTrigger value="calculator" className="text-xs sm:text-sm">Salary Calculator</TabsTrigger>
          <TabsTrigger value="analytics" className="text-xs sm:text-sm">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="calculator">
          <SalaryCalculator />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4 sm:space-y-6">
          {/* Monthly Trend Chart */}
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-base sm:text-lg">Monthly Payroll Trend</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Gross vs Net payout comparison over months</CardDescription>
            </CardHeader>
            <CardContent className="p-2 sm:p-6 pt-0">
              <div className="h-[250px] sm:h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="month" 
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                    />
                    <YAxis 
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                      tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}K`}
                      width={45}
                    />
                    <Tooltip 
                      formatter={(value: number, name: string) => [
                        formatCurrency(value),
                        name === 'gross' ? 'Gross' : name === 'payout' ? 'Net Payout' : 'Deductions'
                      ]}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '0.5rem',
                        fontSize: '12px',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Line
                      type="monotone"
                      dataKey="gross"
                      name="Gross"
                      stroke="hsl(var(--muted-foreground))"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                    />
                    <Line
                      type="monotone"
                      dataKey="payout"
                      name="Net Payout"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--primary))', r: 3 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="deductions"
                      name="Deductions"
                      stroke="hsl(var(--destructive))"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Department Breakdown */}
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-base sm:text-lg">Salary by Department</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Total monthly salary distribution</CardDescription>
              </CardHeader>
              <CardContent className="p-2 sm:p-6 pt-0">
                <div className="h-[250px] sm:h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={departmentBreakdown}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        style={{ fontSize: '10px' }}
                      >
                        {departmentBreakdown.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number) => formatCurrency(value)}
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '0.5rem',
                          fontSize: '12px',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Deduction Breakdown */}
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-base sm:text-lg">Deduction Breakdown</CardTitle>
                <CardDescription className="text-xs sm:text-sm">PF, ESI, and TDS totals</CardDescription>
              </CardHeader>
              <CardContent className="p-2 sm:p-6 pt-0">
                {deductionBreakdown.length === 0 ? (
                  <div className="h-[250px] sm:h-[300px] flex items-center justify-center text-muted-foreground text-sm">
                    No deduction data available. Generate payroll first.
                  </div>
                ) : (
                  <div className="h-[250px] sm:h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={deductionBreakdown}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          style={{ fontSize: '10px' }}
                        >
                          {deductionBreakdown.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: number) => formatCurrency(value)}
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '0.5rem',
                            fontSize: '12px',
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Salary Distribution */}
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-base sm:text-lg">Salary Distribution</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Employee count by salary range</CardDescription>
            </CardHeader>
            <CardContent className="p-2 sm:p-6 pt-0">
              <div className="h-[250px] sm:h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={salaryDistribution}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="range" 
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                    />
                    <YAxis 
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                      allowDecimals={false}
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
                      name="Employees"
                      fill="hsl(var(--primary))" 
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
