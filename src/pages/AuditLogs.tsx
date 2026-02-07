import { useMemo, useState } from 'react';
import { useHRMS } from '@/contexts/HRMSContext';
import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, User, Settings, Calendar, DollarSign } from 'lucide-react';

const entityIcons = {
  employee: User,
  attendance: Calendar,
  payroll: DollarSign,
  settings: Settings,
};

export default function AuditLogs() {
  const { auditLogs } = useHRMS();
  const [searchQuery, setSearchQuery] = useState('');
  const [entityFilter, setEntityFilter] = useState<string>('all');

  const filteredLogs = useMemo(() => {
    return auditLogs.filter(log => {
      const matchesSearch = 
        log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.entityId.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesEntity = entityFilter === 'all' || log.entityType === entityFilter;
      
      return matchesSearch && matchesEntity;
    });
  }, [auditLogs, searchQuery, entityFilter]);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Audit Logs</h1>
        <p className="text-sm text-muted-foreground">Track all changes to salary configurations and payroll</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 sm:pt-6 sm:p-6">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by action, user, or entity..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 text-sm"
              />
            </div>
            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="employee">Employee</SelectItem>
                <SelectItem value="attendance">Attendance</SelectItem>
                <SelectItem value="payroll">Payroll</SelectItem>
                <SelectItem value="settings">Settings</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-base sm:text-lg">Activity Log</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            {filteredLogs.length} entries found
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p className="text-sm">No audit logs found</p>
              <p className="text-xs mt-1">Activity will appear here as changes are made</p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[180px]">Timestamp</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Entity Type</TableHead>
                      <TableHead>Entity ID</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map((log) => {
                      const Icon = entityIcons[log.entityType];
                      return (
                        <TableRow key={log.id}>
                          <TableCell className="text-sm text-muted-foreground">
                            {format(new Date(log.timestamp), 'MMM d, yyyy HH:mm')}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{log.userName}</span>
                              <Badge variant="outline" className="text-xs">
                                {log.userRole === 'super_admin' ? 'Admin' : 'Operator'}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>{log.action}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4 text-muted-foreground" />
                              <span className="capitalize">{log.entityType}</span>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {log.entityId}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-3">
                {filteredLogs.map((log) => {
                  const Icon = entityIcons[log.entityType];
                  return (
                    <div
                      key={log.id}
                      className="p-3 rounded-lg border bg-card"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{log.userName}</span>
                          <Badge variant="outline" className="text-[10px]">
                            {log.userRole === 'super_admin' ? 'Admin' : 'Operator'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Icon className="h-3 w-3" />
                          <span className="capitalize">{log.entityType}</span>
                        </div>
                      </div>
                      <p className="text-sm mb-2">{log.action}</p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{format(new Date(log.timestamp), 'MMM d, yyyy HH:mm')}</span>
                        <span className="font-mono truncate max-w-[120px]">{log.entityId}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
