import { useState } from 'react';
import { useHRMS } from '@/contexts/HRMSContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { UserRole } from '@/types/hrms';
import { getRoleDisplayName, getRoleBadgeVariant } from '@/lib/rbac';
import { Shield, Percent, Save, User, Lock, Unlock } from 'lucide-react';

export default function Settings() {
  const { globalSettings, updateSettings, currentUser, setCurrentUser, hasPermission, checkUserPermission } = useHRMS();
  
  const [pfPercentage, setPfPercentage] = useState(globalSettings.pfPercentage);
  const [esiPercentage, setEsiPercentage] = useState(globalSettings.esiPercentage);
  const [tdsThreshold, setTdsThreshold] = useState(globalSettings.tdsThreshold);
  const [tdsPercentage, setTdsPercentage] = useState(globalSettings.tdsPercentage);
  const [companyTaxPercentage, setCompanyTaxPercentage] = useState(globalSettings.companyTaxPercentage);

  // Use new RBAC permission check
  const settingsPermission = checkUserPermission('settings:edit');
  const canEditSettings = settingsPermission.allowed;

  const handleSave = () => {
    if (!canEditSettings) {
      toast({
        title: 'Permission Denied',
        description: settingsPermission.message,
        variant: 'destructive',
      });
      return;
    }

    updateSettings({
      pfPercentage,
      esiPercentage,
      tdsThreshold,
      tdsPercentage,
      companyTaxPercentage,
    });

    toast({
      title: 'Settings Saved',
      description: 'Global payroll settings have been updated.',
    });
  };

  const handleRoleChange = (role: UserRole) => {
    setCurrentUser({
      ...currentUser,
      role,
    });
    toast({
      title: 'Role Changed',
      description: `You are now logged in as ${role === 'super_admin' ? 'Super Admin' : 'Payroll Operator'}.`,
    });
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">Configure global payroll parameters and user roles</p>
      </div>

      {/* Role Switcher (Demo) */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            <CardTitle className="text-base sm:text-lg">User Role (Demo)</CardTitle>
          </div>
          <CardDescription className="text-xs sm:text-sm">
            Switch between roles to test different permission levels
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="space-y-2 flex-1">
              <Label className="text-xs sm:text-sm">Current Role</Label>
              <Select value={currentUser.role} onValueChange={(v: UserRole) => handleRoleChange(v)}>
                <SelectTrigger className="w-full sm:w-[250px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="super_admin">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Super Admin
                    </div>
                  </SelectItem>
                  <SelectItem value="payroll_operator">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Payroll Operator
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="sm:pt-6">
              <Badge variant={getRoleBadgeVariant(currentUser.role)}>
                {currentUser.role === 'super_admin' 
                  ? 'Full Access' 
                  : 'Limited Access'}
              </Badge>
            </div>
          </div>
          <div className="mt-4 p-3 sm:p-4 rounded-lg bg-muted/50 space-y-2">
            <p className="text-xs sm:text-sm text-muted-foreground">
              <strong className="flex items-center gap-1">
                <Unlock className="h-3 w-3" /> Super Admin:
              </strong> 
              Can edit data, lock payroll, and modify global settings.
            </p>
            <p className="text-xs sm:text-sm text-muted-foreground">
              <strong className="flex items-center gap-1">
                <Lock className="h-3 w-3" /> Payroll Operator:
              </strong> 
              Can add employees, edit attendance, and run calculations. <em>Blocked from Lock Payroll and Settings.</em>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Global Deduction Settings */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <div className="flex items-center gap-2">
            <Percent className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            <CardTitle className="text-base sm:text-lg">Deduction Percentages</CardTitle>
          </div>
          <CardDescription className="text-xs sm:text-sm">
            Configure PF, ESI, and TDS calculation parameters
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0 space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div className="space-y-2">
              <Label htmlFor="pf" className="text-xs sm:text-sm">PF Percentage (%)</Label>
              <Input
                id="pf"
                type="number"
                step="0.01"
                value={pfPercentage}
                onChange={(e) => setPfPercentage(Number(e.target.value))}
                disabled={!canEditSettings}
              />
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                Applied on basic salary (50% of gross), capped at ₹15,000 basic
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="esi" className="text-xs sm:text-sm">ESI Percentage (%)</Label>
              <Input
                id="esi"
                type="number"
                step="0.01"
                value={esiPercentage}
                onChange={(e) => setEsiPercentage(Number(e.target.value))}
                disabled={!canEditSettings}
              />
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                Applied only if gross salary ≤ ₹21,000
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tdsThreshold" className="text-xs sm:text-sm">TDS Threshold (₹)</Label>
              <Input
                id="tdsThreshold"
                type="number"
                value={tdsThreshold}
                onChange={(e) => setTdsThreshold(Number(e.target.value))}
                disabled={!canEditSettings}
              />
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                Monthly salary above this triggers TDS flag
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tdsPercentage" className="text-xs sm:text-sm">TDS Percentage (%)</Label>
              <Input
                id="tdsPercentage"
                type="number"
                step="0.01"
                value={tdsPercentage}
                onChange={(e) => setTdsPercentage(Number(e.target.value))}
                disabled={!canEditSettings}
              />
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                Applied when salary exceeds TDS threshold
              </p>
            </div>

            <div className="space-y-2 sm:col-span-2 lg:col-span-1">
              <Label htmlFor="companyTax" className="text-xs sm:text-sm">Company Tax (%)</Label>
              <Input
                id="companyTax"
                type="number"
                step="0.01"
                value={companyTaxPercentage}
                onChange={(e) => setCompanyTaxPercentage(Number(e.target.value))}
                disabled={!canEditSettings}
              />
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                Company-wide tax percentage applied to payroll
              </p>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t">
            <Button 
              onClick={handleSave} 
              disabled={!canEditSettings}
              className="gap-2 w-full sm:w-auto"
            >
              <Save className="h-4 w-4" />
              Save Settings
            </Button>
          </div>

          {!canEditSettings && (
            <div className="p-3 sm:p-4 rounded-lg bg-warning/10 text-warning text-xs sm:text-sm">
              You need Super Admin privileges to modify these settings.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-base sm:text-lg">Calculation Reference</CardTitle>
          <CardDescription className="text-xs sm:text-sm">How deductions are calculated</CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          <div className="space-y-3 sm:space-y-4 text-xs sm:text-sm">
            <div className="p-2 sm:p-3 rounded-lg bg-muted/50">
              <strong>Pro-Rata Salary:</strong>
              <p className="text-muted-foreground mt-1">
                (Gross Monthly Salary ÷ Days in Month) × Present Days
              </p>
            </div>
            <div className="p-2 sm:p-3 rounded-lg bg-muted/50">
              <strong>PF Deduction:</strong>
              <p className="text-muted-foreground mt-1">
                {pfPercentage}% of Basic Salary (Basic = 50% of Pro-Rata, max ₹15,000)
              </p>
            </div>
            <div className="p-2 sm:p-3 rounded-lg bg-muted/50">
              <strong>ESI Deduction:</strong>
              <p className="text-muted-foreground mt-1">
                {esiPercentage}% of Pro-Rata Salary (only if Pro-Rata ≤ ₹21,000)
              </p>
            </div>
            <div className="p-2 sm:p-3 rounded-lg bg-muted/50">
              <strong>TDS Deduction:</strong>
              <p className="text-muted-foreground mt-1">
                {tdsPercentage}% of Gross Salary (if Gross &gt; ₹{tdsThreshold.toLocaleString()})
              </p>
            </div>
            <div className="p-2 sm:p-3 rounded-lg bg-muted/50">
              <strong>Company Tax:</strong>
              <p className="text-muted-foreground mt-1">
                {companyTaxPercentage}% applied as company-wide tax
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
