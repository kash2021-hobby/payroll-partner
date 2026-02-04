import { useState, useMemo, useCallback } from 'react';
import { useHRMS } from '@/contexts/HRMSContext';
import { formatCurrency, getDaysInMonth } from '@/lib/payroll-engine';
import { calculateCoreSalary } from '@/lib/salary-calculator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Play, 
  Lock, 
  AlertTriangle, 
  CheckCircle2,
  Calculator,
  DollarSign,
  Minus,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

interface PayrollGridRow {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  presentDays: number;
  totalDays: number;
  // Calculated values
  gross: number;
  basic: number;
  pfAmount: number;
  esiAmount: number;
  tdsWarning: boolean;
  // Editable values
  manualTDS: number;
  arrearsAdjustment: number;
  // Computed net
  netPayable: number;
  // Status
  isLocked: boolean;
}

export default function PayrollRun() {
  const { 
    employees, 
    attendanceRecords,
    payrollRecords,
    generatePayroll,
    lockPayroll,
    hasPermission,
    currentUser,
  } = useHRMS();
  
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [payrollGrid, setPayrollGrid] = useState<PayrollGridRow[]>([]);
  const [isGenerated, setIsGenerated] = useState(false);

  const totalDays = getDaysInMonth(selectedYear, selectedMonth);

  /**
   * Calculate Net Payable using the formula:
   * Net = Gross + Arrears - PF - ESI - Manual_TDS
   */
  const calculateNetPayable = useCallback((
    gross: number,
    arrearsAdjustment: number,
    pfAmount: number,
    esiAmount: number,
    manualTDS: number
  ): number => {
    return Math.round(gross + arrearsAdjustment - pfAmount - esiAmount - manualTDS);
  }, []);

  /**
   * Generate/Fetch payroll data and populate the grid
   */
  const handleGeneratePayroll = useCallback(() => {
    const gridData: PayrollGridRow[] = employees
      .filter(emp => emp.isActive)
      .map(emp => {
        // Get attendance for this employee
        const attendance = attendanceRecords.find(
          a => a.employeeId === emp.id && a.month === selectedMonth && a.year === selectedYear
        );
        
        const employeeTotalDays = emp.monthCalculationType === 'fixed_26' ? 26 : totalDays;
        const presentDays = attendance?.presentDays ?? employeeTotalDays;

        // Calculate salary using core calculator
        const calculation = calculateCoreSalary(
          emp.grossMonthlySalary,
          employeeTotalDays,
          presentDays,
          emp.isPFEnabled,
          emp.isESIEnabled
        );

        // Check if there's existing payroll data
        const existingPayroll = payrollRecords.find(
          p => p.employeeId === emp.id && p.month === selectedMonth && p.year === selectedYear
        );

        const manualTDS = existingPayroll?.tdsDeduction ?? 0;
        const arrearsAdjustment = existingPayroll?.previousMonthAdjustment ?? 0;

        // Calculate net payable
        const netPayable = calculateNetPayable(
          calculation.Gross,
          arrearsAdjustment,
          calculation.PF_Amount,
          calculation.ESI_Amount,
          manualTDS
        );

        return {
          id: existingPayroll?.id ?? crypto.randomUUID(),
          employeeId: emp.id,
          employeeCode: emp.employeeId,
          employeeName: `${emp.firstName} ${emp.lastName}`,
          presentDays,
          totalDays: employeeTotalDays,
          gross: calculation.Gross,
          basic: calculation.Basic,
          pfAmount: calculation.PF_Amount,
          esiAmount: calculation.ESI_Amount,
          tdsWarning: calculation.TDS_Warning,
          manualTDS,
          arrearsAdjustment,
          netPayable,
          isLocked: existingPayroll?.isLocked ?? false,
        };
      });

    setPayrollGrid(gridData);
    setIsGenerated(true);
    
    // Also trigger the context's generate payroll
    generatePayroll(selectedMonth, selectedYear);

    toast({
      title: 'Payroll Generated',
      description: `Payroll for ${months[selectedMonth - 1]} ${selectedYear} has been calculated.`,
    });
  }, [employees, attendanceRecords, payrollRecords, selectedMonth, selectedYear, totalDays, calculateNetPayable, generatePayroll]);

  /**
   * Handle Manual TDS change with instant recalculation
   */
  const handleManualTDSChange = useCallback((rowId: string, value: number) => {
    setPayrollGrid(prev => prev.map(row => {
      if (row.id === rowId && !row.isLocked) {
        const newNetPayable = calculateNetPayable(
          row.gross,
          row.arrearsAdjustment,
          row.pfAmount,
          row.esiAmount,
          value
        );
        return {
          ...row,
          manualTDS: value,
          netPayable: newNetPayable,
        };
      }
      return row;
    }));
  }, [calculateNetPayable]);

  /**
   * Handle Arrears Adjustment change with instant recalculation
   */
  const handleArrearsChange = useCallback((rowId: string, value: number) => {
    setPayrollGrid(prev => prev.map(row => {
      if (row.id === rowId && !row.isLocked) {
        const newNetPayable = calculateNetPayable(
          row.gross,
          value,
          row.pfAmount,
          row.esiAmount,
          row.manualTDS
        );
        return {
          ...row,
          arrearsAdjustment: value,
          netPayable: newNetPayable,
        };
      }
      return row;
    }));
  }, [calculateNetPayable]);

  /**
   * Recalculate all rows
   */
  const handleRecalculateAll = useCallback(() => {
    setPayrollGrid(prev => prev.map(row => {
      if (row.isLocked) return row;
      
      const newNetPayable = calculateNetPayable(
        row.gross,
        row.arrearsAdjustment,
        row.pfAmount,
        row.esiAmount,
        row.manualTDS
      );
      return {
        ...row,
        netPayable: newNetPayable,
      };
    }));

    toast({
      title: 'Recalculated',
      description: 'All payroll values have been recalculated.',
    });
  }, [calculateNetPayable]);

  /**
   * Lock a single record
   */
  const handleLockRecord = useCallback((rowId: string) => {
    if (!hasPermission('lock')) {
      toast({
        title: 'Permission Denied',
        description: 'Only Super Admin can lock payroll records.',
        variant: 'destructive',
      });
      return;
    }

    setPayrollGrid(prev => prev.map(row => {
      if (row.id === rowId) {
        return { ...row, isLocked: true };
      }
      return row;
    }));

    // Also lock in context
    const row = payrollGrid.find(r => r.id === rowId);
    if (row) {
      lockPayroll(rowId);
    }

    toast({
      title: 'Record Locked',
      description: 'This payroll record is now read-only.',
    });
  }, [hasPermission, payrollGrid, lockPayroll]);

  /**
   * Lock all records
   */
  const handleLockAll = useCallback(() => {
    if (!hasPermission('lock')) {
      toast({
        title: 'Permission Denied',
        description: 'Only Super Admin can lock payroll records.',
        variant: 'destructive',
      });
      return;
    }

    setPayrollGrid(prev => prev.map(row => ({ ...row, isLocked: true })));

    toast({
      title: 'All Records Locked',
      description: `Payroll for ${months[selectedMonth - 1]} ${selectedYear} has been locked.`,
    });
  }, [hasPermission, selectedMonth, selectedYear]);

  // Calculate totals
  const totals = useMemo(() => {
    return payrollGrid.reduce(
      (acc, row) => ({
        gross: acc.gross + row.gross,
        pfAmount: acc.pfAmount + row.pfAmount,
        esiAmount: acc.esiAmount + row.esiAmount,
        manualTDS: acc.manualTDS + row.manualTDS,
        arrearsAdjustment: acc.arrearsAdjustment + row.arrearsAdjustment,
        netPayable: acc.netPayable + row.netPayable,
      }),
      { gross: 0, pfAmount: 0, esiAmount: 0, manualTDS: 0, arrearsAdjustment: 0, netPayable: 0 }
    );
  }, [payrollGrid]);

  const years = Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - 2 + i);
  const allLocked = payrollGrid.length > 0 && payrollGrid.every(r => r.isLocked);
  const hasUnlockedRows = payrollGrid.some(r => !r.isLocked);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Payroll Run</h1>
          <p className="text-muted-foreground">Generate, adjust, and finalize monthly payroll</p>
        </div>
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            onClick={handleGeneratePayroll}
            className="gap-2"
          >
            <Calculator className="h-4 w-4" />
            {isGenerated ? 'Regenerate' : 'Generate'} Payroll
          </Button>
          {isGenerated && hasUnlockedRows && (
            <>
              <Button 
                variant="outline" 
                onClick={handleRecalculateAll}
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Recalculate All
              </Button>
              {hasPermission('lock') && (
                <Button onClick={handleLockAll} className="gap-2">
                  <Lock className="h-4 w-4" />
                  Lock All
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Period Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Payroll Period</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="space-y-2">
              <Label>Month</Label>
              <Select value={String(selectedMonth)} onValueChange={(v) => {
                setSelectedMonth(Number(v));
                setIsGenerated(false);
                setPayrollGrid([]);
              }}>
                <SelectTrigger className="w-[180px]">
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
              <Select value={String(selectedYear)} onValueChange={(v) => {
                setSelectedYear(Number(v));
                setIsGenerated(false);
                setPayrollGrid([]);
              }}>
                <SelectTrigger className="w-[120px]">
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
          </div>
        </CardContent>
      </Card>

      {/* Formula Reference */}
      <Card className="bg-muted/30">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium">Formula:</span>
            <code className="bg-background px-2 py-1 rounded text-xs">
              Net Payable = Gross + Arrears - PF - ESI - Manual_TDS
            </code>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      {isGenerated && payrollGrid.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground">Gross Total</p>
              <p className="text-lg font-bold">{formatCurrency(totals.gross)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground">PF Total</p>
              <p className="text-lg font-bold text-destructive">-{formatCurrency(totals.pfAmount)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground">ESI Total</p>
              <p className="text-lg font-bold text-destructive">-{formatCurrency(totals.esiAmount)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground">TDS Total</p>
              <p className="text-lg font-bold text-destructive">-{formatCurrency(totals.manualTDS)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground">Arrears Total</p>
              <p className={cn("text-lg font-bold", totals.arrearsAdjustment >= 0 ? "text-success" : "text-destructive")}>
                {totals.arrearsAdjustment >= 0 ? '+' : ''}{formatCurrency(totals.arrearsAdjustment)}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-primary text-primary-foreground">
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-primary-foreground/80">Net Payable</p>
              <p className="text-lg font-bold">{formatCurrency(totals.netPayable)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Payroll Grid */}
      <Card>
        <CardHeader>
          <CardTitle>Payroll Grid</CardTitle>
          <CardDescription>
            {isGenerated 
              ? `${months[selectedMonth - 1]} ${selectedYear} • ${payrollGrid.length} employees`
              : 'Click "Generate Payroll" to load data'
            }
            {allLocked && (
              <Badge className="ml-2" variant="secondary">
                <Lock className="h-3 w-3 mr-1" />
                All Locked
              </Badge>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isGenerated ? (
            <div className="text-center py-12">
              <Calculator className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">
                Select a period and generate payroll to view data
              </p>
              <Button onClick={handleGeneratePayroll} className="gap-2">
                <Play className="h-4 w-4" />
                Generate Payroll
              </Button>
            </div>
          ) : payrollGrid.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No active employees found
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="sticky left-0 bg-muted/50">Employee</TableHead>
                    <TableHead className="text-center w-[80px]">Days</TableHead>
                    <TableHead className="text-right w-[110px]">Gross</TableHead>
                    <TableHead className="text-right w-[100px]">PF</TableHead>
                    <TableHead className="text-right w-[100px]">ESI</TableHead>
                    <TableHead className="text-center w-[130px]">Manual TDS (₹)</TableHead>
                    <TableHead className="text-center w-[150px]">Arrears (+/-) ₹</TableHead>
                    <TableHead className="text-right w-[120px]">Net Payable</TableHead>
                    <TableHead className="text-center w-[100px]">Status</TableHead>
                    <TableHead className="text-right w-[80px]">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payrollGrid.map((row) => (
                    <TableRow 
                      key={row.id}
                      className={cn(
                        row.tdsWarning && 'bg-warning/5',
                        row.isLocked && 'opacity-75'
                      )}
                    >
                      <TableCell className="sticky left-0 bg-card">
                        <div className="flex items-center gap-2">
                          <div>
                            <p className="font-medium">{row.employeeName}</p>
                            <p className="text-xs text-muted-foreground">{row.employeeCode}</p>
                          </div>
                          {row.tdsWarning && (
                            <span title="TDS Warning: Gross > ₹50,000">
                              <AlertTriangle className="h-4 w-4 text-warning" />
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {row.presentDays}/{row.totalDays}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(row.gross)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground">
                        -{formatCurrency(row.pfAmount)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground">
                        -{formatCurrency(row.esiAmount)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Input
                          type="number"
                          min={0}
                          value={row.manualTDS}
                          onChange={(e) => handleManualTDSChange(row.id, Number(e.target.value) || 0)}
                          disabled={row.isLocked}
                          className="w-24 text-center mx-auto"
                          placeholder="0"
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Input
                          type="number"
                          value={row.arrearsAdjustment}
                          onChange={(e) => handleArrearsChange(row.id, Number(e.target.value) || 0)}
                          disabled={row.isLocked}
                          className="w-28 text-center mx-auto"
                          placeholder="0"
                        />
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold">
                        <span className={cn(
                          row.netPayable < 0 && 'text-destructive'
                        )}>
                          {formatCurrency(row.netPayable)}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        {row.isLocked ? (
                          <Badge variant="secondary" className="gap-1">
                            <Lock className="h-3 w-3" />
                            Locked
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Ready
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {!row.isLocked && hasPermission('lock') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleLockRecord(row.id)}
                          >
                            <Lock className="h-3 w-3" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {/* Totals Row */}
                  <TableRow className="bg-muted/50 font-semibold">
                    <TableCell className="sticky left-0 bg-muted/50">
                      <span className="font-bold">TOTALS</span>
                    </TableCell>
                    <TableCell className="text-center">-</TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(totals.gross)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-destructive">
                      -{formatCurrency(totals.pfAmount)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-destructive">
                      -{formatCurrency(totals.esiAmount)}
                    </TableCell>
                    <TableCell className="text-center font-mono text-destructive">
                      -{formatCurrency(totals.manualTDS)}
                    </TableCell>
                    <TableCell className={cn(
                      "text-center font-mono",
                      totals.arrearsAdjustment >= 0 ? "text-success" : "text-destructive"
                    )}>
                      {totals.arrearsAdjustment >= 0 ? '+' : ''}{formatCurrency(totals.arrearsAdjustment)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-lg">
                      {formatCurrency(totals.netPayable)}
                    </TableCell>
                    <TableCell></TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Calculation Details Card */}
      {isGenerated && payrollGrid.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Calculation Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              <div className="p-3 rounded-lg bg-muted/50">
                <strong>Gross (Pro-Rata):</strong>
                <p className="text-xs text-muted-foreground mt-1">
                  (Monthly Salary ÷ Days in Month) × Present Days
                </p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <strong>PF Deduction:</strong>
                <p className="text-xs text-muted-foreground mt-1">
                  12% of Basic (if enabled & Basic ≤ ₹15,000)
                </p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <strong>ESI Deduction:</strong>
                <p className="text-xs text-muted-foreground mt-1">
                  0.75% of Gross (if enabled & Gross ≤ ₹21,000)
                </p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <strong>TDS Warning:</strong>
                <p className="text-xs text-muted-foreground mt-1">
                  Flagged if Gross &gt; ₹50,000
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
