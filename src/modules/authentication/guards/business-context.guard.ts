import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { BusinessMembersService } from 'src/modules/business-members/service/business-members.service';
import { AuthenticatedRequest } from '../interface/jwt-payload.interface';

@Injectable()
export class BusinessContextGuard implements CanActivate {
  constructor(private readonly businessMemberService: BusinessMembersService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user?.userId) {
      throw new UnauthorizedException('Pease login to continue');
    }

    const membership =
      await this.businessMemberService.findActiveBusinessMembershipForUser(
        user.userId,
      );

    if (!membership) {
      throw new ForbiddenException('Please select an active business');
    }

    request.businessMembership = membership;
    request.user = {
      ...user,
      businessId: membership.businessId,
      environment: membership.business.environment,
      permissions:
        membership.role.permissions?.map(
          (rolePermission) => rolePermission.permission.key,
        ) ?? [],
    };

    return true;
  }
}
