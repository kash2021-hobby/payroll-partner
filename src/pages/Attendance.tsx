import { useState, useRef } from 'react';
import { useHRMS } from '@/contexts/HRMSContext';
import { getDaysInMonth } from '@/lib/payroll-engine';
import { 
  processAttendanceCSV, 
  generateSampleCSV,
  AttendanceCSVResult 
} from '@/lib/attendance-csv-parser';
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
  Upload, 
  Save, 
  FileSpreadsheet, 
  AlertCircle, 
  CheckCircle2, 
  XCircle,
  Download,
  Eye,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

interface AttendanceEntry {
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  presentDays: number;
  totalDays: number;
  overtimeHours: number;
  oneTimeSalaryOverride: number;
}

export default function Attendance() {
  const { employees, attendanceRecords, bulkUpdateAttendance } = useHRMS();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [attendanceData, setAttendanceData] = useState<AttendanceEntry[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // CSV Upload state
  const [csvResult, setCsvResult] = useState<AttendanceCSVResult | null>(null);
  const [showValidationDialog, setShowValidationDialog] = useState(false);

  const totalDays = getDaysInMonth(selectedYear, selectedMonth);

  // Initialize or load attendance data when month/year changes
  const loadAttendance = () => {
    const data: AttendanceEntry[] = employees
      .filter(emp => emp.isActive)
      .map(emp => {
        const existing = attendanceRecords.find(
          a => a.employeeId === emp.id && a.month === selectedMonth && a.year === selectedYear
        );
        return {
          employeeId: emp.id,
          employeeName: `${emp.firstName} ${emp.lastName}`,
          employeeCode: emp.employeeId,
          presentDays: existing?.presentDays ?? (emp.monthCalculationType === 'fixed_26' ? 26 : totalDays),
          totalDays: emp.monthCalculationType === 'fixed_26' ? 26 : totalDays,
          overtimeHours: existing?.overtimeHours ?? 0,
          oneTimeSalaryOverride: existing?.oneTimeSalaryOverride ?? 0,
        };
      });
    setAttendanceData(data);
    setHasUnsavedChanges(false);
    setCsvResult(null);
  };

  // Load on first render
  useState(() => {
    loadAttendance();
  });

  const handleMonthChange = (month: string) => {
    setSelectedMonth(Number(month));
    setTimeout(loadAttendance, 0);
  };

  const handleYearChange = (year: string) => {
    setSelectedYear(Number(year));
    setTimeout(loadAttendance, 0);
  };

  const updateEntry = (employeeId: string, field: keyof AttendanceEntry, value: number) => {
    setAttendanceData(prev =>
      prev.map(entry =>
        entry.employeeId === employeeId ? { ...entry, [field]: value } : entry
      )
    );
    setHasUnsavedChanges(true);
  };

  const handleCSVUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const csvContent = e.target?.result as string;
      
      // Process CSV with full validation
      const result = processAttendanceCSV(csvContent, employees, totalDays);
      setCsvResult(result);
      setShowValidationDialog(true);

      if (result.success) {
        // Apply valid records to attendance data
        setAttendanceData(prev =>
          prev.map(entry => {
            const csvMatch = result.validRecords.find(
              r => r.employeeId === entry.employeeId
            );
            if (csvMatch) {
              return {
                ...entry,
                presentDays: Math.min(csvMatch.daysPresent, entry.totalDays),
              };
            }
            return entry;
          })
        );
        setHasUnsavedChanges(true);
        
        toast({
          title: 'CSV Processed Successfully',
          description: `${result.summary.valid} records imported.`,
        });
      } else {
        toast({
          title: 'CSV Validation Failed',
          description: `${result.summary.invalid} errors found. Review the validation report.`,
          variant: 'destructive',
        });
      }
    };
    reader.readAsText(file);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleApplyValidRecords = () => {
    if (!csvResult) return;

    // Apply only valid records
    setAttendanceData(prev =>
      prev.map(entry => {
        const csvMatch = csvResult.validRecords.find(
          r => r.employeeId === entry.employeeId
        );
        if (csvMatch) {
          return {
            ...entry,
            presentDays: Math.min(csvMatch.daysPresent, entry.totalDays),
          };
        }
        return entry;
      })
    );
    setHasUnsavedChanges(true);
    setShowValidationDialog(false);
    
    toast({
      title: 'Valid Records Applied',
      description: `${csvResult.summary.valid} records have been applied. Invalid records were skipped.`,
    });
  };

  const handleSave = () => {
    const records = attendanceData.map(entry => ({
      employeeId: entry.employeeId,
      presentDays: entry.presentDays,
      overtimeHours: entry.overtimeHours,
    }));

    bulkUpdateAttendance(records, selectedMonth, selectedYear);

    toast({
      title: 'Attendance Saved',
      description: `Attendance for ${months[selectedMonth - 1]} ${selectedYear} has been saved.`,
    });
    setHasUnsavedChanges(false);
  };

  const handleDownloadSample = () => {
    const csv = generateSampleCSV();
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'attendance_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const years = Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - 2 + i);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Attendance</h1>
          <p className="text-muted-foreground">Manage monthly attendance and overtime records</p>
        </div>
        <div className="flex gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleCSVUpload}
            className="hidden"
          />
          <Button variant="outline" onClick={handleDownloadSample} className="gap-2">
            <Download className="h-4 w-4" />
            Download Template
          </Button>
          <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="gap-2">
            <Upload className="h-4 w-4" />
            Upload CSV
          </Button>
          <Button onClick={handleSave} disabled={!hasUnsavedChanges} className="gap-2">
            <Save className="h-4 w-4" />
            Save Changes
          </Button>
        </div>
      </div>

      {/* Month/Year Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Period</CardTitle>
          <CardDescription>Choose the month and year for attendance entry</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="space-y-2">
              <Label>Month</Label>
              <Select value={String(selectedMonth)} onValueChange={handleMonthChange}>
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
              <Select value={String(selectedYear)} onValueChange={handleYearChange}>
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
            <div className="flex items-end">
              <Button variant="outline" onClick={loadAttendance}>
                Load
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CSV Format Guide */}
      <Alert>
        <FileSpreadsheet className="h-4 w-4" />
        <AlertTitle>CSV Format</AlertTitle>
        <AlertDescription>
          Required columns: <code className="bg-muted px-1 rounded">Employee_Code</code>, <code className="bg-muted px-1 rounded">Days_Present</code>
          <br />
          <span className="text-muted-foreground text-sm">
            The Employee_Code must match the system's Employee ID (e.g., EMP001, EMP002).
          </span>
        </AlertDescription>
      </Alert>

      {/* CSV Validation Result Alert */}
      {csvResult && (
        <Alert variant={csvResult.success ? 'default' : 'destructive'}>
          {csvResult.success ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <AlertTitle>
            CSV Validation {csvResult.success ? 'Successful' : 'Failed'}
          </AlertTitle>
          <AlertDescription>
            <div className="flex items-center gap-4 mt-2">
              <Badge variant="outline">Processed: {csvResult.summary.processed}</Badge>
              <Badge variant="default" className="bg-success">Valid: {csvResult.summary.valid}</Badge>
              {csvResult.summary.invalid > 0 && (
                <Badge variant="destructive">Invalid: {csvResult.summary.invalid}</Badge>
              )}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowValidationDialog(true)}
                className="gap-1 ml-auto"
              >
                <Eye className="h-3 w-3" />
                View Details
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {hasUnsavedChanges && (
        <Alert className="border-warning">
          <AlertCircle className="h-4 w-4 text-warning" />
          <AlertDescription className="text-warning">
            You have unsaved changes. Click "Save Changes" to persist attendance data.
          </AlertDescription>
        </Alert>
      )}

      {/* Attendance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Attendance Entry</CardTitle>
          <CardDescription>
            {months[selectedMonth - 1]} {selectedYear} • {totalDays} calendar days
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Code</TableHead>
                  <TableHead className="w-[200px]">Employee</TableHead>
                  <TableHead className="w-[120px]">Present Days</TableHead>
                  <TableHead className="w-[100px]">Total Days</TableHead>
                  <TableHead className="w-[140px]">Overtime (hrs)</TableHead>
                  <TableHead className="w-[160px]">One-time Bonus (₹)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendanceData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No active employees found. Add employees first.
                    </TableCell>
                  </TableRow>
                ) : (
                  attendanceData.map((entry) => (
                    <TableRow key={entry.employeeId}>
                      <TableCell className="font-mono text-sm">
                        {entry.employeeCode}
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{entry.employeeName}</p>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={0}
                          max={entry.totalDays}
                          value={entry.presentDays}
                          onChange={(e) =>
                            updateEntry(
                              entry.employeeId,
                              'presentDays',
                              Math.min(Number(e.target.value), entry.totalDays)
                            )
                          }
                          className="w-20"
                        />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {entry.totalDays}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={0}
                          value={entry.overtimeHours}
                          onChange={(e) =>
                            updateEntry(entry.employeeId, 'overtimeHours', Number(e.target.value))
                          }
                          className="w-20"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={0}
                          value={entry.oneTimeSalaryOverride}
                          onChange={(e) =>
                            updateEntry(
                              entry.employeeId,
                              'oneTimeSalaryOverride',
                              Number(e.target.value)
                            )
                          }
                          className="w-28"
                          placeholder="0"
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Validation Details Dialog */}
      <Dialog open={showValidationDialog} onOpenChange={setShowValidationDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>CSV Validation Report</DialogTitle>
            <DialogDescription>
              Detailed results of the attendance CSV validation
            </DialogDescription>
          </DialogHeader>

          {csvResult && (
            <div className="space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-muted/50 text-center">
                  <p className="text-2xl font-bold">{csvResult.summary.processed}</p>
                  <p className="text-sm text-muted-foreground">Total Rows</p>
                </div>
                <div className="p-4 rounded-lg bg-success/10 text-center">
                  <p className="text-2xl font-bold text-success">{csvResult.summary.valid}</p>
                  <p className="text-sm text-muted-foreground">Valid</p>
                </div>
                <div className="p-4 rounded-lg bg-destructive/10 text-center">
                  <p className="text-2xl font-bold text-destructive">{csvResult.summary.invalid}</p>
                  <p className="text-sm text-muted-foreground">Invalid</p>
                </div>
              </div>

              {/* Errors */}
              {csvResult.errors.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-destructive flex items-center gap-2">
                    <XCircle className="h-4 w-4" />
                    Errors ({csvResult.errors.length})
                  </h4>
                  <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 space-y-2 max-h-[200px] overflow-y-auto">
                    {csvResult.errors.map((error, index) => (
                      <p key={index} className="text-sm font-mono">
                        {error}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Valid Records */}
              {csvResult.validRecords.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-success flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Valid Records ({csvResult.validRecords.length})
                  </h4>
                  <div className="rounded-lg border p-4 max-h-[200px] overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Row</TableHead>
                          <TableHead>Employee Code</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Days Present</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {csvResult.validRecords.map((record, index) => (
                          <TableRow key={index}>
                            <TableCell>{record.rowNumber}</TableCell>
                            <TableCell className="font-mono">{record.employeeCode}</TableCell>
                            <TableCell>{record.employeeName}</TableCell>
                            <TableCell>{record.daysPresent}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* Invalid Records */}
              {csvResult.invalidRecords.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-destructive flex items-center gap-2">
                    <XCircle className="h-4 w-4" />
                    Invalid Records ({csvResult.invalidRecords.length})
                  </h4>
                  <div className="rounded-lg border border-destructive/20 p-4 max-h-[200px] overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Row</TableHead>
                          <TableHead>Employee Code</TableHead>
                          <TableHead>Error</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {csvResult.invalidRecords.map((record, index) => (
                          <TableRow key={index}>
                            <TableCell>{record.rowNumber}</TableCell>
                            <TableCell className="font-mono">{record.employeeCode}</TableCell>
                            <TableCell className="text-destructive text-sm">{record.error}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setShowValidationDialog(false)}>
                  Close
                </Button>
                {csvResult.validRecords.length > 0 && !csvResult.success && (
                  <Button onClick={handleApplyValidRecords}>
                    Apply {csvResult.validRecords.length} Valid Records Only
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
