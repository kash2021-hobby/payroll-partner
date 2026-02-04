import { useState } from 'react';
import { useHRMS } from '@/contexts/HRMSContext';
import { Employee, SalaryType, MonthCalculationType } from '@/types/hrms';
import { formatCurrency } from '@/lib/payroll-engine';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Pencil, Trash2, Search, UserPlus } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const defaultEmployee: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'> = {
  employeeId: '',
  firstName: '',
  lastName: '',
  email: '',
  department: '',
  designation: '',
  dateOfJoining: new Date(),
  grossMonthlySalary: 0,
  salaryType: 'monthly',
  monthCalculationType: 'calendar',
  isPFEnabled: true,
  isESIEnabled: false,
  isTDSEnabled: false,
  bankAccountNumber: '',
  bankName: '',
  ifscCode: '',
  isActive: true,
};

export default function Employees() {
  const { employees, addEmployee, updateEmployee, deleteEmployee, hasPermission } = useHRMS();
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState(defaultEmployee);

  const filteredEmployees = employees.filter(
    (emp) =>
      emp.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.employeeId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenDialog = (employee?: Employee) => {
    if (employee) {
      setEditingEmployee(employee);
      setFormData({
        employeeId: employee.employeeId,
        firstName: employee.firstName,
        lastName: employee.lastName,
        email: employee.email,
        department: employee.department,
        designation: employee.designation,
        dateOfJoining: employee.dateOfJoining,
        grossMonthlySalary: employee.grossMonthlySalary,
        salaryType: employee.salaryType,
        monthCalculationType: employee.monthCalculationType,
        isPFEnabled: employee.isPFEnabled,
        isESIEnabled: employee.isESIEnabled,
        isTDSEnabled: employee.isTDSEnabled,
        bankAccountNumber: employee.bankAccountNumber,
        bankName: employee.bankName,
        ifscCode: employee.ifscCode,
        isActive: employee.isActive,
      });
    } else {
      setEditingEmployee(null);
      setFormData({
        ...defaultEmployee,
        employeeId: `EMP${String(employees.length + 1).padStart(3, '0')}`,
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.firstName || !formData.lastName || !formData.email) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }

    if (editingEmployee) {
      updateEmployee(editingEmployee.id, formData);
      toast({
        title: 'Employee Updated',
        description: `${formData.firstName} ${formData.lastName}'s profile has been updated.`,
      });
    } else {
      addEmployee(formData);
      toast({
        title: 'Employee Added',
        description: `${formData.firstName} ${formData.lastName} has been added to the system.`,
      });
    }

    setIsDialogOpen(false);
    setEditingEmployee(null);
    setFormData(defaultEmployee);
  };

  const handleDelete = (employee: Employee) => {
    if (confirm(`Are you sure you want to delete ${employee.firstName} ${employee.lastName}?`)) {
      deleteEmployee(employee.id);
      toast({
        title: 'Employee Deleted',
        description: `${employee.firstName} ${employee.lastName} has been removed from the system.`,
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Employees</h1>
          <p className="text-muted-foreground">Manage employee profiles and salary configuration</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()} className="gap-2">
              <UserPlus className="h-4 w-4" />
              Add Employee
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingEmployee ? 'Edit Employee' : 'Add New Employee'}
              </DialogTitle>
              <DialogDescription>
                {editingEmployee
                  ? 'Update employee information and salary configuration.'
                  : 'Enter employee details and configure salary settings.'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                  Basic Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="employeeId">Employee ID</Label>
                    <Input
                      id="employeeId"
                      value={formData.employeeId}
                      onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                      placeholder="EMP001"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="john@company.com"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      placeholder="John"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      placeholder="Doe"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="department">Department</Label>
                    <Input
                      id="department"
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      placeholder="Engineering"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="designation">Designation</Label>
                    <Input
                      id="designation"
                      value={formData.designation}
                      onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                      placeholder="Senior Developer"
                    />
                  </div>
                </div>
              </div>

              {/* Salary Configuration */}
              <div className="space-y-4">
                <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                  Salary Configuration
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="grossMonthlySalary">Gross Monthly Salary (₹)</Label>
                    <Input
                      id="grossMonthlySalary"
                      type="number"
                      value={formData.grossMonthlySalary}
                      onChange={(e) =>
                        setFormData({ ...formData, grossMonthlySalary: Number(e.target.value) })
                      }
                      placeholder="50000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Salary Type</Label>
                    <Select
                      value={formData.salaryType}
                      onValueChange={(value: SalaryType) =>
                        setFormData({ ...formData, salaryType: value })
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
                  <div className="space-y-2 col-span-2">
                    <Label>Month Calculation Type</Label>
                    <Select
                      value={formData.monthCalculationType}
                      onValueChange={(value: MonthCalculationType) =>
                        setFormData({ ...formData, monthCalculationType: value })
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
                </div>

                {/* Toggles */}
                <div className="grid grid-cols-3 gap-4 pt-2">
                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <Label htmlFor="pf">PF Enabled</Label>
                      <p className="text-xs text-muted-foreground">Provident Fund</p>
                    </div>
                    <Switch
                      id="pf"
                      checked={formData.isPFEnabled}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, isPFEnabled: checked })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <Label htmlFor="esi">ESI Enabled</Label>
                      <p className="text-xs text-muted-foreground">State Insurance</p>
                    </div>
                    <Switch
                      id="esi"
                      checked={formData.isESIEnabled}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, isESIEnabled: checked })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <Label htmlFor="tds">TDS Flag</Label>
                      <p className="text-xs text-muted-foreground">Tax Deduction</p>
                    </div>
                    <Switch
                      id="tds"
                      checked={formData.isTDSEnabled}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, isTDSEnabled: checked })
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Bank Details */}
              <div className="space-y-4">
                <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                  Bank Details
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bankName">Bank Name</Label>
                    <Input
                      id="bankName"
                      value={formData.bankName}
                      onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                      placeholder="HDFC Bank"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bankAccountNumber">Account Number</Label>
                    <Input
                      id="bankAccountNumber"
                      value={formData.bankAccountNumber}
                      onChange={(e) =>
                        setFormData({ ...formData, bankAccountNumber: e.target.value })
                      }
                      placeholder="1234567890"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ifscCode">IFSC Code</Label>
                    <Input
                      id="ifscCode"
                      value={formData.ifscCode}
                      onChange={(e) => setFormData({ ...formData, ifscCode: e.target.value })}
                      placeholder="HDFC0001234"
                    />
                  </div>
                </div>
              </div>

              {/* Active Status */}
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <Label htmlFor="active">Active Employee</Label>
                  <p className="text-xs text-muted-foreground">
                    Inactive employees won't appear in payroll
                  </p>
                </div>
                <Switch
                  id="active"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingEmployee ? 'Update Employee' : 'Add Employee'}
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
              placeholder="Search employees by name, ID, or department..."
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
          <CardTitle>Employee Directory</CardTitle>
          <CardDescription>
            {filteredEmployees.length} of {employees.length} employees
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Gross Salary</TableHead>
                  <TableHead>Config</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No employees found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEmployees.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-sm">
                            {employee.firstName[0]}
                            {employee.lastName[0]}
                          </div>
                          <div>
                            <p className="font-medium">
                              {employee.firstName} {employee.lastName}
                            </p>
                            <p className="text-sm text-muted-foreground">{employee.employeeId}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p>{employee.department}</p>
                        <p className="text-sm text-muted-foreground">{employee.designation}</p>
                      </TableCell>
                      <TableCell className="font-mono">
                        {formatCurrency(employee.grossMonthlySalary)}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {employee.isPFEnabled && (
                            <Badge variant="outline" className="text-xs">PF</Badge>
                          )}
                          {employee.isESIEnabled && (
                            <Badge variant="outline" className="text-xs">ESI</Badge>
                          )}
                          {employee.isTDSEnabled && (
                            <Badge variant="outline" className="text-xs border-warning text-warning">TDS</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={employee.isActive ? 'default' : 'secondary'}>
                          {employee.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDialog(employee)}
                            disabled={!hasPermission('edit')}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(employee)}
                            disabled={!hasPermission('edit')}
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
        </CardContent>
      </Card>
    </div>
  );
}
