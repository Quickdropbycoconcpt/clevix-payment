import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsEnum } from 'src/modules/business-members/enums/business-member.enums';
import { JwtPayload } from '../interface/jwt-payload.interface';
export const PERMISSIONS_KEY = 'user-permissions';
export const PermissionGranted = (...roles: PermissionsEnum[]) => {
  console.log('PermissionGranted roles:', roles);
  return SetMetadata(PERMISSIONS_KEY, roles);
};
@Injectable()
export class AccessControlGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const skipRoleCheck = this.reflector.getAllAndOverride<boolean>(
        'skipRoleCheck',
        [context.getHandler(), context.getClass()],
      );

      const request = context.switchToHttp().getRequest();

      if (!request.user) {
        /***This means the route is not protected */
        return true;
      }

      if (skipRoleCheck) return true;

      const requiredPermissions = this.reflector.getAllAndOverride<
        PermissionsEnum[]
      >(PERMISSIONS_KEY, [context.getHandler(), context.getClass()]);

      const user = request.user as JwtPayload;
      const permissions = user.permissions;

      if (!permissions) {
        throw new ForbiddenException('Permissions are required');
      }

      const userPermissions = new Set(permissions.map((rp) => rp));

      if (!requiredPermissions) return true;

      const hasAll = requiredPermissions.every((p) => userPermissions.has(p));

      if (!hasAll) {
        throw new ForbiddenException(
          'You are not allowed to use this resources',
        );
      }

      return hasAll;
    } catch (error: any) {
      throw new ForbiddenException(error.message);
    }
  }
}
