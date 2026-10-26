import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const IS_SUPER_ADMIN_KEY = 'isSuperAdmin';
export const SuperAdminOnly = () => SetMetadata(IS_SUPER_ADMIN_KEY, true);
