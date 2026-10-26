import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY, IS_SUPER_ADMIN_KEY } from '../../../common/decorators/permissions.decorator';
import { AuthService } from '../auth.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    const superAdminOnly = this.reflector.getAllAndOverride<boolean>(
      IS_SUPER_ADMIN_KEY,
      [context.getHandler(), context.getClass()],
    );

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) return false;
    if (user.isSuperAdmin) return true;

    if (superAdminOnly) {
      throw new ForbiddenException('Super admin access required');
    }

    if (!requiredPermissions || requiredPermissions.length === 0) return true;

    const tenantId = request.tenantId || request.headers['x-tenant-id'];
    if (!tenantId) {
      throw new ForbiddenException('Tenant context required');
    }

    const userPermissions = await this.authService.getUserPermissions(user.id, tenantId);

    const hasPermission = requiredPermissions.some(p => userPermissions.includes(p));
    if (!hasPermission) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
