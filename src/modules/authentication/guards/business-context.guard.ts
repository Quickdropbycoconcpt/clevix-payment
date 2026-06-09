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

    if (!user.businessId) {
      throw new ForbiddenException('You need to setup a buiness');
    }

    const membership =
      await this.businessMemberService.findActiveBusinessMembership(
        user.userId,
        user.businessId,
      );

    if (!membership) {
      throw new ForbiddenException(
        'You are currenty not an active member of this business',
      );
    }

    request.businessMembership = membership;

    return true;
  }
}
