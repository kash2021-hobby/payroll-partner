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
import { Shield, Percent, Save, User } from 'lucide-react';

export default function Settings() {
  const { globalSettings, updateSettings, currentUser, setCurrentUser, hasPermission } = useHRMS();
  
  const [pfPercentage, setPfPercentage] = useState(globalSettings.pfPercentage);
  const [esiPercentage, setEsiPercentage] = useState(globalSettings.esiPercentage);
  const [tdsThreshold, setTdsThreshold] = useState(globalSettings.tdsThreshold);
  const [tdsPercentage, setTdsPercentage] = useState(globalSettings.tdsPercentage);

  const canEditSettings = hasPermission('settings');

  const handleSave = () => {
    if (!canEditSettings) {
      toast({
        title: 'Permission Denied',
        description: 'Only Super Admin can modify global settings.',
        variant: 'destructive',
      });
      return;
    }

    updateSettings({
      pfPercentage,
      esiPercentage,
      tdsThreshold,
      tdsPercentage,
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground">Configure global payroll parameters and user roles</p>
      </div>

      {/* Role Switcher (Demo) */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            <CardTitle>User Role (Demo)</CardTitle>
          </div>
          <CardDescription>
            Switch between roles to test different permission levels
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="space-y-2 flex-1">
              <Label>Current Role</Label>
              <Select value={currentUser.role} onValueChange={(v: UserRole) => handleRoleChange(v)}>
                <SelectTrigger className="w-[250px]">
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
            <div className="pt-6">
              <Badge variant={currentUser.role === 'super_admin' ? 'default' : 'secondary'}>
                {currentUser.role === 'super_admin' 
                  ? 'Full Access' 
                  : 'Edit Only (No Lock/Settings)'}
              </Badge>
            </div>
          </div>
          <div className="mt-4 p-4 rounded-lg bg-muted/50">
            <p className="text-sm text-muted-foreground">
              <strong>Super Admin:</strong> Can edit data, lock payroll, and modify global settings.<br />
              <strong>Payroll Operator:</strong> Can only edit employee and attendance data.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Global Deduction Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Percent className="h-5 w-5 text-primary" />
            <CardTitle>Deduction Percentages</CardTitle>
          </div>
          <CardDescription>
            Configure PF, ESI, and TDS calculation parameters
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="pf">PF Percentage (%)</Label>
              <Input
                id="pf"
                type="number"
                step="0.01"
                value={pfPercentage}
                onChange={(e) => setPfPercentage(Number(e.target.value))}
                disabled={!canEditSettings}
              />
              <p className="text-xs text-muted-foreground">
                Applied on basic salary (50% of gross), capped at ₹15,000 basic
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="esi">ESI Percentage (%)</Label>
              <Input
                id="esi"
                type="number"
                step="0.01"
                value={esiPercentage}
                onChange={(e) => setEsiPercentage(Number(e.target.value))}
                disabled={!canEditSettings}
              />
              <p className="text-xs text-muted-foreground">
                Applied only if gross salary ≤ ₹21,000
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tdsThreshold">TDS Threshold (₹)</Label>
              <Input
                id="tdsThreshold"
                type="number"
                value={tdsThreshold}
                onChange={(e) => setTdsThreshold(Number(e.target.value))}
                disabled={!canEditSettings}
              />
              <p className="text-xs text-muted-foreground">
                Monthly salary above this triggers TDS flag
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tdsPercentage">TDS Percentage (%)</Label>
              <Input
                id="tdsPercentage"
                type="number"
                step="0.01"
                value={tdsPercentage}
                onChange={(e) => setTdsPercentage(Number(e.target.value))}
                disabled={!canEditSettings}
              />
              <p className="text-xs text-muted-foreground">
                Applied when salary exceeds TDS threshold
              </p>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t">
            <Button 
              onClick={handleSave} 
              disabled={!canEditSettings}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              Save Settings
            </Button>
          </div>

          {!canEditSettings && (
            <div className="p-4 rounded-lg bg-warning/10 text-warning text-sm">
              You need Super Admin privileges to modify these settings.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Calculation Reference</CardTitle>
          <CardDescription>How deductions are calculated</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm">
            <div className="p-3 rounded-lg bg-muted/50">
              <strong>Pro-Rata Salary:</strong>
              <p className="text-muted-foreground mt-1">
                (Gross Monthly Salary ÷ Days in Month) × Present Days
              </p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <strong>PF Deduction:</strong>
              <p className="text-muted-foreground mt-1">
                {pfPercentage}% of Basic Salary (Basic = 50% of Pro-Rata, max ₹15,000)
              </p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <strong>ESI Deduction:</strong>
              <p className="text-muted-foreground mt-1">
                {esiPercentage}% of Pro-Rata Salary (only if Pro-Rata ≤ ₹21,000)
              </p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <strong>TDS Deduction:</strong>
              <p className="text-muted-foreground mt-1">
                {tdsPercentage}% of Gross Salary (if Gross &gt; ₹{tdsThreshold.toLocaleString()})
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
