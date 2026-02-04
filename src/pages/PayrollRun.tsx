import { useState, useMemo, useCallback } from 'react';
import { useHRMS } from '@/contexts/HRMSContext';
import { formatCurrency, getDaysInMonth } from '@/lib/payroll-engine';
import { calculateCoreSalary } from '@/lib/salary-calculator';
import { generatePayslipPDF, PayslipData } from '@/lib/payslip-generator';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Play, 
  Lock, 
  AlertTriangle, 
  CheckCircle2,
  Calculator,
  RefreshCw,
  FileDown,
  Download,
  ShieldCheck,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const COMPANY_NAME = 'PayrollPro Technologies Pvt. Ltd.';

interface PayrollGridRow {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  department: string;
  designation: string;
  bankAccount: string;
  bankName: string;
  presentDays: number;
  totalDays: number;
  // Calculated values
  gross: number;
  basic: number;
  hra: number;
  otherAllowances: number;
  pfAmount: number;
  esiAmount: number;
  tdsWarning: boolean;
  // Editable values
  manualTDS: number;
  arrearsAdjustment: number;
  // Computed values
  totalEarnings: number;
  totalDeductions: number;
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
  } = useHRMS();
  
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [payrollGrid, setPayrollGrid] = useState<PayrollGridRow[]>([]);
  const [isGenerated, setIsGenerated] = useState(false);
  const [isMonthLocked, setIsMonthLocked] = useState(false);
  const [showLockConfirmDialog, setShowLockConfirmDialog] = useState(false);

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

        // Calculate component breakdown
        const basic = calculation.Basic;
        const hra = Math.round(calculation.Gross * 0.20);
        const otherAllowances = calculation.Gross - basic - hra;

        // Check if there's existing payroll data
        const existingPayroll = payrollRecords.find(
          p => p.employeeId === emp.id && p.month === selectedMonth && p.year === selectedYear
        );

        const manualTDS = existingPayroll?.tdsDeduction ?? 0;
        const arrearsAdjustment = existingPayroll?.previousMonthAdjustment ?? 0;

        // Calculate totals
        const totalEarnings = calculation.Gross + arrearsAdjustment;
        const totalDeductions = calculation.PF_Amount + calculation.ESI_Amount + manualTDS;
        const netPayable = totalEarnings - totalDeductions;

        return {
          id: existingPayroll?.id ?? crypto.randomUUID(),
          employeeId: emp.id,
          employeeCode: emp.employeeId,
          employeeName: `${emp.firstName} ${emp.lastName}`,
          department: emp.department,
          designation: emp.designation,
          bankAccount: emp.bankAccountNumber,
          bankName: emp.bankName,
          presentDays,
          totalDays: employeeTotalDays,
          gross: calculation.Gross,
          basic,
          hra,
          otherAllowances,
          pfAmount: calculation.PF_Amount,
          esiAmount: calculation.ESI_Amount,
          tdsWarning: calculation.TDS_Warning,
          manualTDS,
          arrearsAdjustment,
          totalEarnings,
          totalDeductions,
          netPayable,
          isLocked: existingPayroll?.isLocked ?? false,
        };
      });

    setPayrollGrid(gridData);
    setIsGenerated(true);
    setIsMonthLocked(gridData.length > 0 && gridData.every(r => r.isLocked));
    
    // Also trigger the context's generate payroll
    generatePayroll(selectedMonth, selectedYear);

    toast({
      title: 'Payroll Generated',
      description: `Payroll for ${months[selectedMonth - 1]} ${selectedYear} has been calculated.`,
    });
  }, [employees, attendanceRecords, payrollRecords, selectedMonth, selectedYear, totalDays, generatePayroll]);

  /**
   * Handle Manual TDS change with instant recalculation
   */
  const handleManualTDSChange = useCallback((rowId: string, value: number) => {
    if (isMonthLocked) return;
    
    setPayrollGrid(prev => prev.map(row => {
      if (row.id === rowId && !row.isLocked) {
        const totalDeductions = row.pfAmount + row.esiAmount + value;
        const netPayable = row.totalEarnings - totalDeductions;
        return {
          ...row,
          manualTDS: value,
          totalDeductions,
          netPayable,
        };
      }
      return row;
    }));
  }, [isMonthLocked]);

  /**
   * Handle Arrears Adjustment change with instant recalculation
   */
  const handleArrearsChange = useCallback((rowId: string, value: number) => {
    if (isMonthLocked) return;
    
    setPayrollGrid(prev => prev.map(row => {
      if (row.id === rowId && !row.isLocked) {
        const totalEarnings = row.gross + value;
        const netPayable = totalEarnings - row.totalDeductions;
        return {
          ...row,
          arrearsAdjustment: value,
          totalEarnings,
          netPayable,
        };
      }
      return row;
    }));
  }, [isMonthLocked]);

  /**
   * Recalculate all rows
   */
  const handleRecalculateAll = useCallback(() => {
    if (isMonthLocked) return;
    
    setPayrollGrid(prev => prev.map(row => {
      if (row.isLocked) return row;
      
      const totalEarnings = row.gross + row.arrearsAdjustment;
      const totalDeductions = row.pfAmount + row.esiAmount + row.manualTDS;
      const netPayable = totalEarnings - totalDeductions;
      
      return {
        ...row,
        totalEarnings,
        totalDeductions,
        netPayable,
      };
    }));

    toast({
      title: 'Recalculated',
      description: 'All payroll values have been recalculated.',
    });
  }, [isMonthLocked]);

  /**
   * LOCK_PAYROLL: Lock the entire month's payroll
   * This prevents any further edits for the month
   */
  const handleLockPayroll = useCallback(() => {
    if (!hasPermission('lock')) {
      toast({
        title: 'Permission Denied',
        description: 'Only Super Admin can lock payroll records.',
        variant: 'destructive',
      });
      return;
    }

    // Lock all records in the grid
    setPayrollGrid(prev => prev.map(row => ({ ...row, isLocked: true })));
    setIsMonthLocked(true);

    // Lock in context for each record
    payrollGrid.forEach(row => {
      if (!row.isLocked) {
        lockPayroll(row.id);
      }
    });

    setShowLockConfirmDialog(false);

    toast({
      title: 'Payroll Locked',
      description: `Payroll for ${months[selectedMonth - 1]} ${selectedYear} has been finalized. No further edits allowed.`,
    });
  }, [hasPermission, payrollGrid, lockPayroll, selectedMonth, selectedYear]);

  /**
   * Generate PDF Payslip for a single employee
   */
  const handleGeneratePayslip = useCallback((row: PayrollGridRow) => {
    const payslipData: PayslipData = {
      companyName: COMPANY_NAME,
      employeeId: row.employeeId,
      employeeCode: row.employeeCode,
      employeeName: row.employeeName,
      department: row.department,
      designation: row.designation,
      bankAccount: row.bankAccount,
      bankName: row.bankName,
      month: months[selectedMonth - 1],
      year: selectedYear,
      presentDays: row.presentDays,
      totalDays: row.totalDays,
      gross: row.gross,
      basic: row.basic,
      hra: row.hra,
      otherAllowances: row.otherAllowances,
      arrears: row.arrearsAdjustment,
      totalEarnings: row.totalEarnings,
      pfAmount: row.pfAmount,
      esiAmount: row.esiAmount,
      tdsAmount: row.manualTDS,
      totalDeductions: row.totalDeductions,
      netPayable: row.netPayable,
      generatedDate: new Date(),
    };

    generatePayslipPDF(payslipData);

    toast({
      title: 'Payslip Generated',
      description: `PDF payslip for ${row.employeeName} has been downloaded.`,
    });
  }, [selectedMonth, selectedYear]);

  /**
   * Generate PDF Payslips for all employees
   */
  const handleGenerateAllPayslips = useCallback(() => {
    payrollGrid.forEach((row, index) => {
      setTimeout(() => {
        handleGeneratePayslip(row);
      }, index * 600); // Stagger downloads to prevent browser issues
    });

    toast({
      title: 'Generating Payslips',
      description: `Downloading ${payrollGrid.length} payslips. Please wait...`,
    });
  }, [payrollGrid, handleGeneratePayslip]);

  // Calculate totals
  const totals = useMemo(() => {
    return payrollGrid.reduce(
      (acc, row) => ({
        gross: acc.gross + row.gross,
        pfAmount: acc.pfAmount + row.pfAmount,
        esiAmount: acc.esiAmount + row.esiAmount,
        manualTDS: acc.manualTDS + row.manualTDS,
        arrearsAdjustment: acc.arrearsAdjustment + row.arrearsAdjustment,
        totalDeductions: acc.totalDeductions + row.totalDeductions,
        netPayable: acc.netPayable + row.netPayable,
      }),
      { gross: 0, pfAmount: 0, esiAmount: 0, manualTDS: 0, arrearsAdjustment: 0, totalDeductions: 0, netPayable: 0 }
    );
  }, [payrollGrid]);

  const years = Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - 2 + i);
  const hasUnlockedRows = payrollGrid.some(r => !r.isLocked);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Payroll Run</h1>
          <p className="text-muted-foreground">Generate, adjust, and finalize monthly payroll</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button 
            variant="outline" 
            onClick={handleGeneratePayroll}
            className="gap-2"
          >
            <Calculator className="h-4 w-4" />
            {isGenerated ? 'Regenerate' : 'Generate'} Payroll
          </Button>
          {isGenerated && !isMonthLocked && (
            <>
              <Button 
                variant="outline" 
                onClick={handleRecalculateAll}
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Recalculate
              </Button>
              {hasPermission('lock') && hasUnlockedRows && (
                <Button 
                  onClick={() => setShowLockConfirmDialog(true)} 
                  variant="default"
                  className="gap-2"
                >
                  <Lock className="h-4 w-4" />
                  Finalize & Lock
                </Button>
              )}
            </>
          )}
          {isGenerated && payrollGrid.length > 0 && (
            <Button 
              variant="outline" 
              onClick={handleGenerateAllPayslips}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Download All Payslips
            </Button>
          )}
        </div>
      </div>

      {/* Locked Status Banner */}
      {isMonthLocked && (
        <div className="bg-success/10 border border-success/20 rounded-lg p-4 flex items-center gap-3">
          <ShieldCheck className="h-6 w-6 text-success" />
          <div>
            <p className="font-semibold text-success">Payroll Finalized & Locked</p>
            <p className="text-sm text-muted-foreground">
              {months[selectedMonth - 1]} {selectedYear} payroll is locked. No further edits are allowed.
            </p>
          </div>
        </div>
      )}

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
                setIsMonthLocked(false);
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
                setIsMonthLocked(false);
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
            {isMonthLocked && (
              <Badge className="ml-2 bg-success" variant="secondary">
                <Lock className="h-3 w-3 mr-1" />
                Locked
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
                    <TableHead className="text-center w-[100px]">Payslip</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payrollGrid.map((row) => (
                    <TableRow 
                      key={row.id}
                      className={cn(
                        row.tdsWarning && 'bg-warning/5',
                        isMonthLocked && 'opacity-75'
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
                          disabled={isMonthLocked || row.isLocked}
                          className="w-24 text-center mx-auto"
                          placeholder="0"
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Input
                          type="number"
                          value={row.arrearsAdjustment}
                          onChange={(e) => handleArrearsChange(row.id, Number(e.target.value) || 0)}
                          disabled={isMonthLocked || row.isLocked}
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
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleGeneratePayslip(row)}
                          className="gap-1"
                        >
                          <FileDown className="h-4 w-4" />
                          PDF
                        </Button>
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
            <CardTitle className="text-base">Payslip Contents</CardTitle>
            <CardDescription>Each PDF payslip includes the following</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              <div className="p-3 rounded-lg bg-muted/50">
                <strong>Header:</strong>
                <p className="text-xs text-muted-foreground mt-1">
                  Company Name, Employee Name, Employee ID, Department
                </p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <strong>Earnings:</strong>
                <p className="text-xs text-muted-foreground mt-1">
                  Basic (50%), HRA (20%), Other Allowances, Arrears
                </p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <strong>Deductions:</strong>
                <p className="text-xs text-muted-foreground mt-1">
                  PF, ESI, TDS / Manual TDS
                </p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <strong>Summary:</strong>
                <p className="text-xs text-muted-foreground mt-1">
                  Total Earnings, Total Deductions, Net Payable
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lock Confirmation Dialog */}
      <Dialog open={showLockConfirmDialog} onOpenChange={setShowLockConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Finalize & Lock Payroll
            </DialogTitle>
            <DialogDescription>
              You are about to lock the payroll for <strong>{months[selectedMonth - 1]} {selectedYear}</strong>.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="p-4 rounded-lg bg-warning/10 border border-warning/20">
              <p className="text-sm text-warning font-medium mb-2">⚠️ This action cannot be undone</p>
              <p className="text-sm text-muted-foreground">
                Once locked, no further changes can be made to:
              </p>
              <ul className="text-sm text-muted-foreground mt-2 list-disc list-inside">
                <li>Manual TDS amounts</li>
                <li>Arrears/Adjustments</li>
                <li>Any salary calculations</li>
              </ul>
            </div>

            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm font-medium mb-2">Summary</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-muted-foreground">Employees:</span>
                <span className="font-mono">{payrollGrid.length}</span>
                <span className="text-muted-foreground">Total Net Payable:</span>
                <span className="font-mono font-semibold">{formatCurrency(totals.netPayable)}</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowLockConfirmDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleLockPayroll} className="gap-2">
              <Lock className="h-4 w-4" />
              Confirm & Lock
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
