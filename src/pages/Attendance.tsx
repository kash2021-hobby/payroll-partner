import { useState, useRef, useEffect } from 'react';
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
  Calendar,
  Clock,
  Users,
  Loader2,
  CheckCircle2,
  XCircle,
  Coffee,
} from 'lucide-react';
import { format, parseISO, isToday, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';

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

  // Get days in month for daily view
  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(new Date(selectedYear, selectedMonth - 1)),
    end: endOfMonth(new Date(selectedYear, selectedMonth - 1)),
  });

  const years = Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - 2 + i);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'present':
        return <Badge className="bg-green-100 text-green-800">Present</Badge>;
      case 'late':
        return <Badge className="bg-yellow-100 text-yellow-800">Late</Badge>;
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Attendance</h1>
          <p className="text-muted-foreground">View attendance records from database</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'summary' ? 'default' : 'outline'}
            onClick={() => setViewMode('summary')}
          >
            Summary
          </Button>
          <Button
            variant={viewMode === 'daily' ? 'default' : 'outline'}
            onClick={() => setViewMode('daily')}
          >
            Daily Log
          </Button>
        </div>
      </div>

      {/* Month/Year Selection */}
      <Card>
        <CardContent className="pt-6">
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-green-100">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalPresent}</p>
                <p className="text-sm text-muted-foreground">Present Days</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-yellow-100">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalLate}</p>
                <p className="text-sm text-muted-foreground">Late Days</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-red-100">
                <XCircle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalAbsent}</p>
                <p className="text-sm text-muted-foreground">Absent Days</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-blue-100">
                <Coffee className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalHours.toFixed(1)}</p>
                <p className="text-sm text-muted-foreground">Total Hours</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {viewMode === 'summary' ? (
        /* Summary View - Per Employee */
        <Card>
          <CardHeader>
            <CardTitle>Monthly Summary</CardTitle>
            <CardDescription>
              {months[selectedMonth - 1]} {selectedYear} • {attendanceSummary.length} employees
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
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
                          <Badge variant="outline" className="bg-green-50">
                            {summary.presentDays}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="bg-yellow-50">
                            {summary.lateDays}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="bg-red-50">
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
          </CardContent>
        </Card>
      ) : (
        /* Daily Log View */
        <Card>
          <CardHeader>
            <CardTitle>Daily Attendance Log</CardTitle>
            <CardDescription>
              All clock-in/clock-out records for {months[selectedMonth - 1]} {selectedYear}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
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
          </CardContent>
        </Card>
      )}
    </div>
  );
}
