import { useState } from 'react';
import { useEmployees, useAttendance, MockEmployee, MockAttendance } from '@/hooks/use-mock-data';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
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
  Calendar,
  Clock,
  Loader2,
  CheckCircle2,
  XCircle,
  Coffee,
} from 'lucide-react';
import { format, parseISO, eachDayOfInterval, startOfMonth, endOfMonth } from 'date-fns';

const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

interface AttendanceSummary {
  employeeId: string;
  employeeName: string;
  position: string;
  department: string;
  presentDays: number;
  lateDays: number;
  absentDays: number;
  leaveDays: number;
  totalHours: number;
  records: MockAttendance[];
}

export default function Attendance() {
  const { data: employees, isLoading: empLoading } = useEmployees();
  const { data: attendanceRecords, isLoading: attLoading } = useAttendance();
  
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [viewMode, setViewMode] = useState<'summary' | 'daily'>('summary');

  const isLoading = empLoading || attLoading;

  // Filter attendance for selected month/year
  const filteredAttendance = (attendanceRecords || []).filter((record) => {
    const date = new Date(record.date);
    return date.getMonth() + 1 === selectedMonth && date.getFullYear() === selectedYear;
  });

  // Calculate summary per employee
  const attendanceSummary: AttendanceSummary[] = (employees || [])
    .filter((emp) => emp.status === 'active')
    .map((emp) => {
      const empRecords = filteredAttendance.filter((r) => r.employee_id === emp.id);
      
      return {
        employeeId: emp.id,
        employeeName: emp.full_name,
        position: emp.position || 'N/A',
        department: emp.department || 'N/A',
        presentDays: empRecords.filter((r) => r.status === 'present').length,
        lateDays: empRecords.filter((r) => r.status === 'late').length,
        absentDays: empRecords.filter((r) => r.status === 'absent').length,
        leaveDays: empRecords.filter((r) => r.status === 'on-leave').length,
        totalHours: empRecords.reduce((sum, r) => sum + (Number(r.total_hours) || 0), 0),
        records: empRecords,
      };
    });

  // Stats cards
  const totalPresent = attendanceSummary.reduce((sum, s) => sum + s.presentDays, 0);
  const totalLate = attendanceSummary.reduce((sum, s) => sum + s.lateDays, 0);
  const totalAbsent = attendanceSummary.reduce((sum, s) => sum + s.absentDays, 0);
  const totalHours = attendanceSummary.reduce((sum, s) => sum + s.totalHours, 0);

  const years = Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - 2 + i);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'present':
        return <Badge className="bg-success/20 text-success border-success/30">Present</Badge>;
      case 'late':
        return <Badge className="bg-warning/20 text-warning border-warning/30">Late</Badge>;
      case 'absent':
        return <Badge variant="destructive">Absent</Badge>;
      case 'on-leave':
        return <Badge variant="secondary">On Leave</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatTime = (dateString: string | null) => {
    if (!dateString) return '-';
    return format(parseISO(dateString), 'hh:mm a');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Attendance</h1>
          <p className="text-sm text-muted-foreground">View attendance records from database</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'summary' ? 'default' : 'outline'}
            onClick={() => setViewMode('summary')}
            size="sm"
            className="flex-1 sm:flex-none"
          >
            Summary
          </Button>
          <Button
            variant={viewMode === 'daily' ? 'default' : 'outline'}
            onClick={() => setViewMode('daily')}
            size="sm"
            className="flex-1 sm:flex-none"
          >
            Daily Log
          </Button>
        </div>
      </div>

      {/* Month/Year Selection */}
      <Card>
        <CardContent className="pt-4 sm:pt-6">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="space-y-2 flex-1 sm:flex-none">
              <Label className="text-xs sm:text-sm">Month</Label>
              <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(Number(v))}>
                <SelectTrigger className="w-full sm:w-[180px]">
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
            <div className="space-y-2 flex-1 sm:flex-none">
              <Label className="text-xs sm:text-sm">Year</Label>
              <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
                <SelectTrigger className="w-full sm:w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
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

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardContent className="p-3 sm:pt-6 sm:p-6">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="p-2 sm:p-3 rounded-full bg-success/10">
                <CheckCircle2 className="h-4 w-4 sm:h-6 sm:w-6 text-success" />
              </div>
              <div>
                <p className="text-lg sm:text-2xl font-bold">{totalPresent}</p>
                <p className="text-[10px] sm:text-sm text-muted-foreground">Present Days</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:pt-6 sm:p-6">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="p-2 sm:p-3 rounded-full bg-warning/10">
                <Clock className="h-4 w-4 sm:h-6 sm:w-6 text-warning" />
              </div>
              <div>
                <p className="text-lg sm:text-2xl font-bold">{totalLate}</p>
                <p className="text-[10px] sm:text-sm text-muted-foreground">Late Days</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:pt-6 sm:p-6">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="p-2 sm:p-3 rounded-full bg-destructive/10">
                <XCircle className="h-4 w-4 sm:h-6 sm:w-6 text-destructive" />
              </div>
              <div>
                <p className="text-lg sm:text-2xl font-bold">{totalAbsent}</p>
                <p className="text-[10px] sm:text-sm text-muted-foreground">Absent Days</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:pt-6 sm:p-6">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="p-2 sm:p-3 rounded-full bg-primary/10">
                <Coffee className="h-4 w-4 sm:h-6 sm:w-6 text-primary" />
              </div>
              <div>
                <p className="text-lg sm:text-2xl font-bold">{totalHours.toFixed(1)}</p>
                <p className="text-[10px] sm:text-sm text-muted-foreground">Total Hours</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {viewMode === 'summary' ? (
        /* Summary View - Per Employee */
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg">Monthly Summary</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              {months[selectedMonth - 1]} {selectedYear} • {attendanceSummary.length} employees
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            {/* Desktop Table */}
            <div className="hidden md:block rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead className="text-center">Present</TableHead>
                    <TableHead className="text-center">Late</TableHead>
                    <TableHead className="text-center">Absent</TableHead>
                    <TableHead className="text-center">Leave</TableHead>
                    <TableHead className="text-right">Total Hours</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendanceSummary.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No attendance records found for this period
                      </TableCell>
                    </TableRow>
                  ) : (
                    attendanceSummary.map((summary) => (
                      <TableRow key={summary.employeeId}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="text-sm font-medium text-primary">
                                {summary.employeeName.split(' ').map((n) => n[0]).join('').toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium">{summary.employeeName}</p>
                              <p className="text-sm text-muted-foreground">{summary.position}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{summary.department}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="bg-success/10">
                            {summary.presentDays}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="bg-warning/10">
                            {summary.lateDays}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="bg-destructive/10">
                            {summary.absentDays}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline">
                            {summary.leaveDays}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {summary.totalHours.toFixed(1)} hrs
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
              {attendanceSummary.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground text-sm">
                  No attendance records found for this period
                </p>
              ) : (
                attendanceSummary.map((summary) => (
                  <div
                    key={summary.employeeId}
                    className="p-3 rounded-lg border bg-card"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-medium text-primary">
                          {summary.employeeName.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{summary.employeeName}</p>
                        <p className="text-xs text-muted-foreground">{summary.department}</p>
                      </div>
                      <p className="text-sm font-medium text-primary">{summary.totalHours.toFixed(1)} hrs</p>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-center">
                      <div className="p-2 rounded bg-success/10">
                        <p className="text-sm font-bold text-success">{summary.presentDays}</p>
                        <p className="text-[10px] text-muted-foreground">Present</p>
                      </div>
                      <div className="p-2 rounded bg-warning/10">
                        <p className="text-sm font-bold text-warning">{summary.lateDays}</p>
                        <p className="text-[10px] text-muted-foreground">Late</p>
                      </div>
                      <div className="p-2 rounded bg-destructive/10">
                        <p className="text-sm font-bold text-destructive">{summary.absentDays}</p>
                        <p className="text-[10px] text-muted-foreground">Absent</p>
                      </div>
                      <div className="p-2 rounded bg-muted">
                        <p className="text-sm font-bold">{summary.leaveDays}</p>
                        <p className="text-[10px] text-muted-foreground">Leave</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Daily Log View */
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg">Daily Attendance Log</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              All clock-in/clock-out records for {months[selectedMonth - 1]} {selectedYear}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            {/* Desktop Table */}
            <div className="hidden md:block rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Sign In</TableHead>
                    <TableHead>Sign Out</TableHead>
                    <TableHead>Hours</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAttendance.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No attendance records found for this period
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAttendance
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .map((record) => (
                        <TableRow key={record.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              {format(parseISO(record.date), 'dd MMM yyyy')}
                            </div>
                          </TableCell>
                          <TableCell>
                            <p className="font-medium">
                              {employees?.find(e => e.id === record.employee_id)?.full_name || 'Unknown'}
                            </p>
                          </TableCell>
                          <TableCell>
                            {employees?.find(e => e.id === record.employee_id)?.department || '-'}
                          </TableCell>
                          <TableCell>{formatTime(record.sign_in)}</TableCell>
                          <TableCell>{formatTime(record.sign_out)}</TableCell>
                          <TableCell>
                            {record.total_hours ? `${record.total_hours} hrs` : '-'}
                          </TableCell>
                          <TableCell>{getStatusBadge(record.status)}</TableCell>
                        </TableRow>
                      ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
              {filteredAttendance.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground text-sm">
                  No attendance records found for this period
                </p>
              ) : (
                filteredAttendance
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map((record) => {
                    const emp = employees?.find(e => e.id === record.employee_id);
                    return (
                      <div
                        key={record.id}
                        className="p-3 rounded-lg border bg-card"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-medium text-sm">{emp?.full_name || 'Unknown'}</p>
                            <p className="text-xs text-muted-foreground">{emp?.department || '-'}</p>
                          </div>
                          {getStatusBadge(record.status)}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                          <Calendar className="h-3 w-3" />
                          {format(parseISO(record.date), 'dd MMM yyyy')}
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center text-xs">
                          <div className="p-2 rounded bg-muted">
                            <p className="font-medium">{formatTime(record.sign_in)}</p>
                            <p className="text-muted-foreground">Sign In</p>
                          </div>
                          <div className="p-2 rounded bg-muted">
                            <p className="font-medium">{formatTime(record.sign_out)}</p>
                            <p className="text-muted-foreground">Sign Out</p>
                          </div>
                          <div className="p-2 rounded bg-muted">
                            <p className="font-medium">{record.total_hours || '-'}</p>
                            <p className="text-muted-foreground">Hours</p>
                          </div>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
