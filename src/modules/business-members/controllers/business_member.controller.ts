import { Controller, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from 'src/modules/authentication/decorators/current-user.decorator';
import { JwtAuthGuard } from 'src/modules/authentication/guards/jwt-auth.guard';
import type { JwtPayload } from 'src/modules/authentication/interface/jwt-payload.interface';
import { BusinessMembersService } from '../service/business-members.service';

@ApiTags('Business members management')
@Controller('v1/business-member')
@UseGuards(JwtAuthGuard)
export class BusinessMemberController {
  constructor(private readonly memberService: BusinessMembersService) {}

  async getUserMemberShip(@CurrentUser() user: JwtPayload) {
    const memberShip = await this.memberService.findActiveMembershipsByUser(
      user.userId,
    );
    return memberShip;
  }
}
