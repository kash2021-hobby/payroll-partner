// Role-Based Access Control (RBAC) Module
import { UserRole } from '@/types/hrms';

export type Permission = 
  | 'employee:create'
  | 'employee:edit'
  | 'employee:delete'
  | 'attendance:edit'
  | 'payroll:run'
  | 'payroll:adjust'
  | 'payroll:lock'
  | 'settings:view'
  | 'settings:edit'
  | 'audit:view';

// Permission matrix by role
const rolePermissions: Record<UserRole, Permission[]> = {
  super_admin: [
    'employee:create',
    'employee:edit',
    'employee:delete',
    'attendance:edit',
    'payroll:run',
    'payroll:adjust',
    'payroll:lock',
    'settings:view',
    'settings:edit',
    'audit:view',
  ],
  payroll_operator: [
    'employee:create',
    'employee:edit',
    'attendance:edit',
    'payroll:run',
    'payroll:adjust',
    'settings:view',
    'audit:view',
    // BLOCKED: 'payroll:lock', 'settings:edit', 'employee:delete'
  ],
};

/**
 * Check if a role has a specific permission
 */
export function hasPermissionForRole(role: UserRole, permission: Permission): boolean {
  return rolePermissions[role]?.includes(permission) ?? false;
}

/**
 * Get all permissions for a role
 */
export function getPermissionsForRole(role: UserRole): Permission[] {
  return rolePermissions[role] ?? [];
}

/**
 * Check if a role can perform an action (middleware-style check)
 */
export function checkPermission(role: UserRole, permission: Permission): { allowed: boolean; message: string } {
  const allowed = hasPermissionForRole(role, permission);
  
  if (!allowed) {
    const actionName = getActionName(permission);
    const requiredRole = permission.includes('lock') || permission.includes('settings:edit') 
      ? 'Super Admin' 
      : 'authorized user';
    
    return {
      allowed: false,
      message: `Permission denied: Only ${requiredRole} can ${actionName}.`,
    };
  }
  
  return { allowed: true, message: '' };
}

/**
 * Get human-readable action name from permission
 */
function getActionName(permission: Permission): string {
  const actionMap: Record<Permission, string> = {
    'employee:create': 'add employees',
    'employee:edit': 'edit employees',
    'employee:delete': 'delete employees',
    'attendance:edit': 'modify attendance',
    'payroll:run': 'run payroll calculations',
    'payroll:adjust': 'adjust payroll values',
    'payroll:lock': 'lock payroll records',
    'settings:view': 'view settings',
    'settings:edit': 'modify global settings',
    'audit:view': 'view audit logs',
  };
  return actionMap[permission] ?? permission;
}

/**
 * Get role display name
 */
export function getRoleDisplayName(role: UserRole): string {
  return role === 'super_admin' ? 'Super Admin' : 'Payroll Operator';
}

/**
 * Get role badge variant
 */
export function getRoleBadgeVariant(role: UserRole): 'default' | 'secondary' {
  return role === 'super_admin' ? 'default' : 'secondary';
}
