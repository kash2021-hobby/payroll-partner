import { useState, useMemo } from 'react';
import { useHRMS } from '@/contexts/HRMSContext';
import { formatCurrency } from '@/lib/payroll-engine';
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
  DollarSign,
  Minus,
  Plus,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function PayrollRun() {
  const { 
    employees, 
    payrollRecords, 
    generatePayroll, 
    lockPayroll, 
    updatePayrollAdjustment,
    hasPermission,
    currentUser,
  } = useHRMS();
  
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [adjustmentDialogOpen, setAdjustmentDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<string | null>(null);
  const [adjustmentValue, setAdjustmentValue] = useState(0);

  const currentPayroll = useMemo(() => {
    return payrollRecords.filter(
      p => p.month === selectedMonth && p.year === selectedYear
    );
  }, [payrollRecords, selectedMonth, selectedYear]);

  const totals = useMemo(() => {
    return currentPayroll.reduce(
      (acc, p) => ({
        grossSalary: acc.grossSalary + p.grossSalary,
        totalEarnings: acc.totalEarnings + p.totalEarnings,
        totalDeductions: acc.totalDeductions + p.totalDeductions,
        netPayable: acc.netPayable + p.netPayable,
      }),
      { grossSalary: 0, totalEarnings: 0, totalDeductions: 0, netPayable: 0 }
    );
  }, [currentPayroll]);

  const handleGeneratePayroll = () => {
    generatePayroll(selectedMonth, selectedYear);
    toast({
      title: 'Payroll Generated',
      description: `Payroll for ${months[selectedMonth - 1]} ${selectedYear} has been calculated.`,
    });
  };

  const handleLockRecord = (id: string) => {
    if (!hasPermission('lock')) {
      toast({
        title: 'Permission Denied',
        description: 'Only Super Admin can lock payroll records.',
        variant: 'destructive',
      });
      return;
    }
    lockPayroll(id);
    toast({
      title: 'Payroll Locked',
      description: 'This payroll record is now read-only.',
    });
  };

  const handleLockAll = () => {
    if (!hasPermission('lock')) {
      toast({
        title: 'Permission Denied',
        description: 'Only Super Admin can lock payroll records.',
        variant: 'destructive',
      });
      return;
    }
    
    currentPayroll.forEach(record => {
      if (!record.isLocked) {
        lockPayroll(record.id);
      }
    });
    
    toast({
      title: 'All Payroll Locked',
      description: `All payroll records for ${months[selectedMonth - 1]} ${selectedYear} have been locked.`,
    });
  };

  const openAdjustmentDialog = (recordId: string, currentAdjustment: number) => {
    setSelectedRecord(recordId);
    setAdjustmentValue(currentAdjustment);
    setAdjustmentDialogOpen(true);
  };

  const handleSaveAdjustment = () => {
    if (selectedRecord) {
      updatePayrollAdjustment(selectedRecord, adjustmentValue);
      toast({
        title: 'Adjustment Updated',
        description: 'Previous month adjustment has been applied.',
      });
    }
    setAdjustmentDialogOpen(false);
    setSelectedRecord(null);
  };

  const years = Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - 2 + i);
  const allLocked = currentPayroll.length > 0 && currentPayroll.every(p => p.isLocked);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Payroll Run</h1>
          <p className="text-muted-foreground">Generate and review monthly payroll calculations</p>
        </div>
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            onClick={handleGeneratePayroll}
            className="gap-2"
          >
            <Calculator className="h-4 w-4" />
            {currentPayroll.length > 0 ? 'Recalculate' : 'Generate'} Payroll
          </Button>
          {currentPayroll.length > 0 && !allLocked && hasPermission('lock') && (
            <Button onClick={handleLockAll} variant="default" className="gap-2">
              <Lock className="h-4 w-4" />
              Confirm & Lock All
            </Button>
          )}
        </div>
      </div>

      {/* Month/Year Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Payroll Period</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="space-y-2">
              <Label>Month</Label>
              <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(Number(v))}>
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
              <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
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

      {/* Summary Stats */}
      {currentPayroll.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Gross</p>
                  <p className="text-xl font-bold">{formatCurrency(totals.grossSalary)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-muted-foreground/30" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Earnings</p>
                  <p className="text-xl font-bold">{formatCurrency(totals.totalEarnings)}</p>
                </div>
                <Plus className="h-8 w-8 text-success/30" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Deductions</p>
                  <p className="text-xl font-bold">{formatCurrency(totals.totalDeductions)}</p>
                </div>
                <Minus className="h-8 w-8 text-destructive/30" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-primary text-primary-foreground">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-primary-foreground/80">Net Payable</p>
                  <p className="text-xl font-bold">{formatCurrency(totals.netPayable)}</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-primary-foreground/30" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Payroll Table */}
      <Card>
        <CardHeader>
          <CardTitle>Payroll Summary</CardTitle>
          <CardDescription>
            {months[selectedMonth - 1]} {selectedYear} • {currentPayroll.length} employees
            {allLocked && (
              <Badge className="ml-2" variant="secondary">
                <Lock className="h-3 w-3 mr-1" />
                Locked
              </Badge>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {currentPayroll.length === 0 ? (
            <div className="text-center py-12">
              <Calculator className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">
                No payroll data for {months[selectedMonth - 1]} {selectedYear}
              </p>
              <Button onClick={handleGeneratePayroll} className="gap-2">
                <Play className="h-4 w-4" />
                Generate Payroll
              </Button>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 bg-card">Employee</TableHead>
                    <TableHead className="text-center">Present</TableHead>
                    <TableHead className="text-right">Gross</TableHead>
                    <TableHead className="text-right">Pro-Rata</TableHead>
                    <TableHead className="text-right">Adjustments</TableHead>
                    <TableHead className="text-right">PF</TableHead>
                    <TableHead className="text-right">ESI</TableHead>
                    <TableHead className="text-right">TDS</TableHead>
                    <TableHead className="text-right">Net Payable</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentPayroll.map((record) => (
                    <TableRow 
                      key={record.id}
                      className={cn(
                        record.isTDSFlagged && 'bg-warning/5'
                      )}
                    >
                      <TableCell className="sticky left-0 bg-card">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{record.employeeName}</span>
                          {record.isTDSFlagged && (
                            <AlertTriangle className="h-4 w-4 text-warning" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {record.presentDays}/{record.totalDays}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(record.grossSalary)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(record.proRataSalary)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        <button
                          onClick={() => openAdjustmentDialog(record.id, record.previousMonthAdjustment)}
                          disabled={record.isLocked}
                          className={cn(
                            "hover:underline",
                            record.previousMonthAdjustment > 0 && "text-success",
                            record.previousMonthAdjustment < 0 && "text-destructive",
                            record.isLocked && "cursor-not-allowed opacity-50"
                          )}
                        >
                          {record.previousMonthAdjustment >= 0 ? '+' : ''}
                          {formatCurrency(record.previousMonthAdjustment)}
                        </button>
                      </TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground">
                        -{formatCurrency(record.pfDeduction)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground">
                        -{formatCurrency(record.esiDeduction)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground">
                        -{formatCurrency(record.tdsDeduction)}
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold">
                        {formatCurrency(record.netPayable)}
                      </TableCell>
                      <TableCell className="text-center">
                        {record.isLocked ? (
                          <Badge variant="secondary" className="gap-1">
                            <Lock className="h-3 w-3" />
                            Locked
                          </Badge>
                        ) : (
                          <Badge variant="outline">Pending</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {!record.isLocked && hasPermission('lock') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleLockRecord(record.id)}
                            className="gap-1"
                          >
                            <Lock className="h-3 w-3" />
                            Lock
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Adjustment Dialog */}
      <Dialog open={adjustmentDialogOpen} onOpenChange={setAdjustmentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Previous Month Adjustment</DialogTitle>
            <DialogDescription>
              Enter a positive value for arrears/bonus or negative for deductions.
              This will be added to the final net payable.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="adjustment">Adjustment Amount (₹)</Label>
              <Input
                id="adjustment"
                type="number"
                value={adjustmentValue}
                onChange={(e) => setAdjustmentValue(Number(e.target.value))}
                placeholder="Enter amount (+/-)"
              />
              <p className="text-sm text-muted-foreground">
                Positive: +5000 (arrears, bonus) | Negative: -2000 (deductions)
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setAdjustmentDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveAdjustment}>
              Save Adjustment
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
