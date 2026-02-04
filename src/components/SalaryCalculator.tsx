import { useState } from 'react';
import { useHRMS } from '@/contexts/HRMSContext';
import { calculateSalary, calculateCoreSalary, getCalendarDays } from '@/lib/salary-calculator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Calculator, CheckCircle2, Code } from 'lucide-react';
import { formatCurrency } from '@/lib/payroll-engine';

const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function SalaryCalculator() {
  const { employees } = useHRMS();
  const currentDate = new Date();
  
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [presentDays, setPresentDays] = useState<number>(0);
  const [calculationResult, setCalculationResult] = useState<ReturnType<typeof calculateSalary> | null>(null);
  const [coreResult, setCoreResult] = useState<ReturnType<typeof calculateCoreSalary> | null>(null);

  const selectedEmployee = employees.find(e => e.id === selectedEmployeeId);
  const calendarDays = selectedEmployee?.monthCalculationType === 'fixed_26' 
    ? 26 
    : getCalendarDays(selectedYear, selectedMonth);

  const handleCalculate = () => {
    if (!selectedEmployee) return;

    // Full calculation
    const fullResult = calculateSalary({
      employeeId: selectedEmployee.employeeId,
      month: selectedMonth,
      year: selectedYear,
      presentDays,
      employee: selectedEmployee,
    });
    setCalculationResult(fullResult);

    // Core calculation (simplified output)
    const core = calculateCoreSalary(
      selectedEmployee.grossMonthlySalary,
      calendarDays,
      presentDays,
      selectedEmployee.isPFEnabled,
      selectedEmployee.isESIEnabled
    );
    setCoreResult(core);
  };

  const handleEmployeeChange = (employeeId: string) => {
    setSelectedEmployeeId(employeeId);
    const emp = employees.find(e => e.id === employeeId);
    if (emp) {
      const days = emp.monthCalculationType === 'fixed_26' ? 26 : getCalendarDays(selectedYear, selectedMonth);
      setPresentDays(days);
    }
    setCalculationResult(null);
    setCoreResult(null);
  };

  const years = Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - 2 + i);

  return (
    <div className="space-y-6">
      {/* Input Form */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            <CardTitle>Salary Calculator</CardTitle>
          </div>
          <CardDescription>
            Calculate salary using Pro-Rata formula with PF/ESI deductions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Employee ID</Label>
              <Select value={selectedEmployeeId} onValueChange={handleEmployeeChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.filter(e => e.isActive).map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.employeeId} - {emp.firstName} {emp.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Month</Label>
              <Select 
                value={String(selectedMonth)} 
                onValueChange={(v) => {
                  setSelectedMonth(Number(v));
                  setCalculationResult(null);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month, index) => (
                    <SelectItem key={month} value={String(index + 1)}>
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Year</Label>
              <Select 
                value={String(selectedYear)} 
                onValueChange={(v) => {
                  setSelectedYear(Number(v));
                  setCalculationResult(null);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map(year => (
                    <SelectItem key={year} value={String(year)}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Present Days (max: {calendarDays})</Label>
              <Input
                type="number"
                min={0}
                max={calendarDays}
                value={presentDays}
                onChange={(e) => {
                  setPresentDays(Math.min(Number(e.target.value), calendarDays));
                  setCalculationResult(null);
                }}
              />
            </div>
          </div>

          {selectedEmployee && (
            <div className="flex flex-wrap gap-2 p-3 rounded-lg bg-muted/50">
              <Badge variant="outline">
                Gross: {formatCurrency(selectedEmployee.grossMonthlySalary)}
              </Badge>
              <Badge variant={selectedEmployee.isPFEnabled ? 'default' : 'secondary'}>
                PF: {selectedEmployee.isPFEnabled ? 'ON' : 'OFF'}
              </Badge>
              <Badge variant={selectedEmployee.isESIEnabled ? 'default' : 'secondary'}>
                ESI: {selectedEmployee.isESIEnabled ? 'ON' : 'OFF'}
              </Badge>
              <Badge variant="outline">
                {selectedEmployee.monthCalculationType === 'fixed_26' ? 'Fixed 26 Days' : 'Calendar Days'}
              </Badge>
            </div>
          )}

          <Button 
            onClick={handleCalculate} 
            disabled={!selectedEmployee}
            className="w-full md:w-auto gap-2"
          >
            <Calculator className="h-4 w-4" />
            Calculate Salary
          </Button>
        </CardContent>
      </Card>

      {/* Core Output JSON */}
      {coreResult && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Code className="h-5 w-5 text-primary" />
              <CardTitle>Core Calculation Output (JSON)</CardTitle>
            </div>
            <CardDescription>
              Gross, Basic, PF_Amount, ESI_Amount, TDS_Warning
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <pre className="p-4 rounded-lg bg-foreground/5 border text-sm font-mono overflow-x-auto">
                {JSON.stringify(coreResult, null, 2)}
              </pre>
              {coreResult.TDS_Warning && (
                <Badge className="absolute top-2 right-2 gap-1 bg-warning text-warning-foreground">
                  <AlertTriangle className="h-3 w-3" />
                  TDS Warning
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Full Calculation Result */}
      {calculationResult && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Earnings Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Earnings Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">Calendar Days</span>
                  <span className="font-mono">{calculationResult.calendarDays}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">Present Days</span>
                  <span className="font-mono">{calculationResult.presentDays}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">Pro-Rata Salary</span>
                  <span className="font-mono font-medium">{formatCurrency(calculationResult.ProRataSalary)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">Basic (50%)</span>
                  <span className="font-mono">{formatCurrency(calculationResult.Basic)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">HRA (20%)</span>
                  <span className="font-mono">{formatCurrency(calculationResult.HRA)}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-muted-foreground">Other Allowances (30%)</span>
                  <span className="font-mono">{formatCurrency(calculationResult.OtherAllowances)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Deductions Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Deductions & Flags</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">PF (12% of Basic)</span>
                    {calculationResult.PF_Eligible ? (
                      <Badge variant="default" className="text-xs">Eligible</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">Not Eligible</Badge>
                    )}
                  </div>
                  <span className="font-mono text-destructive">
                    -{formatCurrency(calculationResult.PF_Amount)}
                  </span>
                </div>
                <div className="p-2 rounded bg-muted/50 text-xs text-muted-foreground">
                  PF applies only if: Toggle ON + Basic ≤ ₹15,000
                  <br />
                  Current Basic: {formatCurrency(calculationResult.Basic)} 
                  {calculationResult.Basic > 15000 && ' (exceeds limit)'}
                </div>

                <div className="flex justify-between items-center py-2 border-b">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">ESI (0.75% of Gross)</span>
                    {calculationResult.ESI_Eligible ? (
                      <Badge variant="default" className="text-xs">Eligible</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">Not Eligible</Badge>
                    )}
                  </div>
                  <span className="font-mono text-destructive">
                    -{formatCurrency(calculationResult.ESI_Amount)}
                  </span>
                </div>
                <div className="p-2 rounded bg-muted/50 text-xs text-muted-foreground">
                  ESI applies only if: Toggle ON + Gross ≤ ₹21,000
                  <br />
                  Current Gross: {formatCurrency(calculationResult.Gross)}
                  {calculationResult.Gross > 21000 && ' (exceeds limit)'}
                </div>

                <div className="flex justify-between items-center py-2 border-b">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">TDS Warning</span>
                    {calculationResult.TDS_Warning ? (
                      <Badge variant="outline" className="text-xs border-warning text-warning gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Flagged
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs border-success text-success gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Clear
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="p-2 rounded bg-muted/50 text-xs text-muted-foreground">
                  TDS Warning if Gross &gt; ₹50,000
                </div>

                <div className="flex justify-between items-center py-3 border-t-2 mt-4">
                  <span className="font-medium">Total Deductions</span>
                  <span className="font-mono font-medium text-destructive">
                    -{formatCurrency(calculationResult.TotalDeductions)}
                  </span>
                </div>

                <div className="flex justify-between items-center py-3 bg-primary/10 rounded-lg px-3 -mx-3">
                  <span className="font-semibold">Net Payable</span>
                  <span className="font-mono font-bold text-lg">
                    {formatCurrency(calculationResult.NetPayable)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Formula Reference */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Calculation Formulas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="p-3 rounded-lg bg-muted/50">
              <strong>Pro-Rata Salary:</strong>
              <code className="block mt-1 text-xs bg-background p-2 rounded">
                (Monthly Salary / Calendar Days) × Present Days
              </code>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <strong>Basic Salary:</strong>
              <code className="block mt-1 text-xs bg-background p-2 rounded">
                Pro-Rata Salary × 50%
              </code>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <strong>PF Deduction:</strong>
              <code className="block mt-1 text-xs bg-background p-2 rounded">
                Basic × 12% (if PF ON && Basic ≤ 15000)
              </code>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <strong>ESI Deduction:</strong>
              <code className="block mt-1 text-xs bg-background p-2 rounded">
                Gross × 0.75% (if ESI ON && Gross ≤ 21000)
              </code>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
