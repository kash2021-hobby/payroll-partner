import { useState } from 'react';
import { useEmployees, useCreateEmployee, useUpdateEmployee, useDeleteEmployee } from '@/hooks/use-backend-data';
import { BackendEmployee } from '@/lib/api-service';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UserPlus, Pencil, Trash2, Search, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface EmployeeFormData {
  full_name: string;
  employment_type: 'monthly' | 'daily';
  work_rate: number;
  month_calculation_type: 'calendar' | 'fixed_26';
  is_pf_enabled: boolean;
  is_esi_enabled: boolean;
  is_tds_enabled: boolean;
  status: 'active' | 'on-leave' | 'inactive';
}

const defaultFormData: EmployeeFormData = {
  full_name: '',
  employment_type: 'monthly',
  work_rate: 0,
  month_calculation_type: 'calendar',
  is_pf_enabled: true,
  is_esi_enabled: false,
  is_tds_enabled: false,
  status: 'active',
};

export default function Employees() {
  const { data: employees, isLoading, error } = useEmployees();
  const createEmployee = useCreateEmployee();
  const updateEmployee = useUpdateEmployee();
  const deleteEmployee = useDeleteEmployee();

  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<BackendEmployee | null>(null);
  const [formData, setFormData] = useState<EmployeeFormData>(defaultFormData);

  const filteredEmployees = (employees || []).filter(
    (emp) =>
      emp.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.department?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenDialog = (employee?: BackendEmployee) => {
    if (employee) {
      setEditingEmployee(employee);
      setFormData({
        full_name: employee.full_name,
        employment_type: employee.employment_type === 'daily' ? 'daily' : 'monthly',
        work_rate: employee.work_rate,
        month_calculation_type: (employee as any).month_calculation_type || 'calendar',
        is_pf_enabled: (employee as any).is_pf_enabled ?? true,
        is_esi_enabled: (employee as any).is_esi_enabled ?? false,
        is_tds_enabled: (employee as any).is_tds_enabled ?? false,
        status: employee.status,
      });
    } else {
      setEditingEmployee(null);
      setFormData(defaultFormData);
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.full_name) {
      toast({
        title: 'Validation Error',
        description: 'Please enter employee name.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const payload = {
        ...formData,
        joining_date: new Date().toISOString().split('T')[0],
      };

      if (editingEmployee) {
        await updateEmployee.mutateAsync({ id: editingEmployee.id, data: payload });
        toast({
          title: 'Employee Updated',
          description: `${formData.full_name}'s profile has been updated.`,
        });
      } else {
        await createEmployee.mutateAsync(payload);
        toast({
          title: 'Employee Added',
          description: `${formData.full_name} has been added to the system.`,
        });
      }

      setIsDialogOpen(false);
      setEditingEmployee(null);
      setFormData(defaultFormData);
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Something went wrong',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (employee: BackendEmployee) => {
    if (confirm(`Are you sure you want to delete ${employee.full_name}?`)) {
      try {
        await deleteEmployee.mutateAsync(employee.id);
        toast({
          title: 'Employee Deleted',
          description: `${employee.full_name} has been removed from the system.`,
        });
      } catch (err) {
        toast({
          title: 'Error',
          description: err instanceof Error ? err.message : 'Failed to delete employee',
          variant: 'destructive',
        });
      }
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case 'on-leave':
        return <Badge className="bg-yellow-100 text-yellow-800">On Leave</Badge>;
      case 'inactive':
        return <Badge variant="secondary">Inactive</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <Card className="p-6">
          <p className="text-destructive">Failed to load employees: {error.message}</p>
          <p className="text-sm text-muted-foreground mt-2">
            Make sure your backend is running at the configured API URL.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Employee Directory</h1>
          <p className="text-muted-foreground">Add and manage staff</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()} className="gap-2">
              <UserPlus className="h-4 w-4" />
              Add Employee
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingEmployee ? 'Edit Employee' : 'Add New Employee'}
              </DialogTitle>
              <DialogDescription>
                {editingEmployee
                  ? 'Update employee salary configuration.'
                  : 'Enter employee details and salary settings.'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Employee ID - Auto generated info */}
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground">Employee ID</p>
                <p className="font-mono text-sm">
                  {editingEmployee ? editingEmployee.id.slice(0, 8).toUpperCase() : 'Auto-generated'}
                </p>
              </div>

              {/* Full Name */}
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name *</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="Enter full name"
                  required
                />
              </div>

              {/* Salary Type */}
              <div className="space-y-2">
                <Label>Salary Type</Label>
                <Select
                  value={formData.employment_type}
                  onValueChange={(value: 'monthly' | 'daily') =>
                    setFormData({ ...formData, employment_type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Base Amount */}
              <div className="space-y-2">
                <Label htmlFor="work_rate">
                  Base Amount (₹/{formData.employment_type === 'daily' ? 'day' : 'month'})
                </Label>
                <Input
                  id="work_rate"
                  type="number"
                  value={formData.work_rate}
                  onChange={(e) => setFormData({ ...formData, work_rate: Number(e.target.value) })}
                  placeholder="Enter amount"
                />
              </div>

              {/* Working Days Rule */}
              <div className="space-y-2">
                <Label>Working Days Rule</Label>
                <Select
                  value={formData.month_calculation_type}
                  onValueChange={(value: 'calendar' | 'fixed_26') =>
                    setFormData({ ...formData, month_calculation_type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="calendar">Calendar Days (Actual days in month)</SelectItem>
                    <SelectItem value="fixed_26">Fixed 26 Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Compliance Toggles */}
              <div className="space-y-3">
                <Label className="text-muted-foreground text-xs uppercase tracking-wide">
                  Compliance Settings
                </Label>
                
                {/* PF Applicable */}
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium text-sm">PF Applicable</p>
                    <p className="text-xs text-muted-foreground">Provident Fund (12%)</p>
                  </div>
                  <Switch
                    checked={formData.is_pf_enabled}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, is_pf_enabled: checked })
                    }
                  />
                </div>

                {/* ESI Applicable */}
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium text-sm">ESI Applicable</p>
                    <p className="text-xs text-muted-foreground">Employee State Insurance (0.75%)</p>
                  </div>
                  <Switch
                    checked={formData.is_esi_enabled}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, is_esi_enabled: checked })
                    }
                  />
                </div>

                {/* TDS Applicable */}
                <div className="flex items-center gap-3 p-3 rounded-lg border">
                  <Checkbox
                    id="tds"
                    checked={formData.is_tds_enabled}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, is_tds_enabled: checked === true })
                    }
                  />
                  <div>
                    <Label htmlFor="tds" className="font-medium text-sm cursor-pointer">
                      TDS Applicable
                    </Label>
                    <p className="text-xs text-muted-foreground">Tax Deduction at Source</p>
                  </div>
                </div>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: 'active' | 'on-leave' | 'inactive') =>
                    setFormData({ ...formData, status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="on-leave">On Leave</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createEmployee.isPending || updateEmployee.isPending}
                >
                  {(createEmployee.isPending || updateEmployee.isPending) && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {editingEmployee ? 'Update' : 'Add Employee'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search employees..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Employee Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Employees</CardTitle>
          <CardDescription>
            {isLoading ? 'Loading...' : `${filteredEmployees.length} employees`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee ID</TableHead>
                    <TableHead>Full Name</TableHead>
                    <TableHead>Salary Type</TableHead>
                    <TableHead>Base Amount</TableHead>
                    <TableHead>Days Rule</TableHead>
                    <TableHead>Compliance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        No employees found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredEmployees.map((employee) => (
                      <TableRow key={employee.id}>
                        <TableCell className="font-mono text-xs">
                          {employee.id.slice(0, 8).toUpperCase()}
                        </TableCell>
                        <TableCell>
                          <p className="font-medium">{employee.full_name}</p>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {employee.employment_type === 'daily' ? 'Daily' : 'Monthly'}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatCurrency(employee.work_rate)}</TableCell>
                        <TableCell className="text-sm">
                          {(employee as any).month_calculation_type === 'fixed_26' ? 'Fixed 26' : 'Calendar'}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {(employee as any).is_pf_enabled && (
                              <Badge variant="secondary" className="text-xs">PF</Badge>
                            )}
                            {(employee as any).is_esi_enabled && (
                              <Badge variant="secondary" className="text-xs">ESI</Badge>
                            )}
                            {(employee as any).is_tds_enabled && (
                              <Badge variant="secondary" className="text-xs">TDS</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(employee.status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenDialog(employee)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(employee)}
                              disabled={deleteEmployee.isPending}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
