import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserService } from '../service/user.service';
import { JwtAuthGuard } from 'src/modules/authentication/guards/jwt-auth.guard';
import { CurrentUser } from 'src/modules/authentication/decorators/current-user.decorator';
import type { RequestScope } from 'src/shared/business-scope';
import { UserDto } from '../dto/user.dto';

@Controller('user')
@ApiTags('User Management')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  async getUserDetails(@CurrentUser() user: RequestScope) {
    return this.userService.profile(user.userId);
  }

  @Patch('password')
  async changePassword(
    @CurrentUser() user: RequestScope,
    @Body() dto: UserDto,
  ) {
    return this.userService.changePassword(user.userId, dto);
  }
}
