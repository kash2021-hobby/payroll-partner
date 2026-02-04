import { useState, useRef } from 'react';
import { useHRMS } from '@/contexts/HRMSContext';
import { parseAttendanceCSV, getDaysInMonth } from '@/lib/payroll-engine';
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
import { Upload, Save, FileSpreadsheet, AlertCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';

const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

interface AttendanceEntry {
  employeeId: string;
  employeeName: string;
  presentDays: number;
  totalDays: number;
  overtimeHours: number;
  oneTimeSalaryOverride: number;
}

export default function Attendance() {
  const { employees, attendanceRecords, bulkUpdateAttendance, addAttendanceRecord } = useHRMS();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [attendanceData, setAttendanceData] = useState<AttendanceEntry[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

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
          presentDays: existing?.presentDays ?? totalDays,
          totalDays: emp.monthCalculationType === 'fixed_26' ? 26 : totalDays,
          overtimeHours: existing?.overtimeHours ?? 0,
          oneTimeSalaryOverride: existing?.oneTimeSalaryOverride ?? 0,
        };
      });
    setAttendanceData(data);
    setHasUnsavedChanges(false);
  };

  // Load on first render and when selection changes
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
      try {
        const csvContent = e.target?.result as string;
        const parsedData = parseAttendanceCSV(csvContent);
        
        // Match parsed data with employees
        let matchedCount = 0;
        setAttendanceData(prev =>
          prev.map(entry => {
            const employee = employees.find(emp => emp.id === entry.employeeId);
            const csvMatch = parsedData.find(
              p => p.employeeId === employee?.employeeId
            );
            if (csvMatch) {
              matchedCount++;
              return {
                ...entry,
                presentDays: Math.min(csvMatch.presentDays, entry.totalDays),
                overtimeHours: csvMatch.overtimeHours,
              };
            }
            return entry;
          })
        );

        toast({
          title: 'CSV Uploaded Successfully',
          description: `Matched ${matchedCount} of ${parsedData.length} records from CSV.`,
        });
        setHasUnsavedChanges(true);
      } catch (error) {
        toast({
          title: 'CSV Parse Error',
          description: error instanceof Error ? error.message : 'Failed to parse CSV file.',
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

  const handleSave = () => {
    const records = attendanceData.map(entry => ({
      employeeId: entry.employeeId,
      presentDays: entry.presentDays,
      overtimeHours: entry.overtimeHours,
    }));

    bulkUpdateAttendance(records, selectedMonth, selectedYear);
    
    // Also update one-time overrides
    attendanceData.forEach(entry => {
      if (entry.oneTimeSalaryOverride > 0) {
        const existing = attendanceRecords.find(
          a => a.employeeId === entry.employeeId && 
               a.month === selectedMonth && 
               a.year === selectedYear
        );
        if (existing) {
          // Update would be needed here, for now we'll handle it in context
        }
      }
    });

    toast({
      title: 'Attendance Saved',
      description: `Attendance for ${months[selectedMonth - 1]} ${selectedYear} has been saved.`,
    });
    setHasUnsavedChanges(false);
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
        <AlertDescription>
          <strong>CSV Format:</strong> Upload a CSV with columns: <code>Employee ID</code>, <code>Present Days</code>, and optionally <code>Overtime Hours</code>. 
          The Employee ID should match the system's Employee ID (e.g., EMP001).
        </AlertDescription>
      </Alert>

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
                  <TableHead className="w-[250px]">Employee</TableHead>
                  <TableHead className="w-[120px]">Present Days</TableHead>
                  <TableHead className="w-[120px]">Total Days</TableHead>
                  <TableHead className="w-[140px]">Overtime (hrs)</TableHead>
                  <TableHead className="w-[160px]">One-time Bonus (₹)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendanceData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No active employees found. Add employees first.
                    </TableCell>
                  </TableRow>
                ) : (
                  attendanceData.map((entry) => (
                    <TableRow key={entry.employeeId}>
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
    </div>
  );
}
