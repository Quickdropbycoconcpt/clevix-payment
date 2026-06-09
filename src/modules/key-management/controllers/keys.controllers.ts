import { Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { KeysService } from '../service/keys.service';
import { CurrentUser } from 'src/modules/authentication/decorators/current-user.decorator';
import type { JwtPayload } from 'src/modules/authentication/interface/jwt-payload.interface';
import { BusinessDashboardAuth } from 'src/modules/authentication/decorators/business-dashboard-auth.decorator';
import { PermissionGranted } from 'src/modules/authentication/guards/access-control-guard';
import { PermissionsEnum } from 'src/modules/business-members/enums/business-member.enums';

@ApiTags('Key Management')
@ApiBearerAuth('bearer')
@Controller('keys')
@BusinessDashboardAuth()
export class KeyControllers {
  constructor(private readonly keyService: KeysService) {}
  @PermissionGranted(PermissionsEnum.KEY_VIEW)
  @Post('keys')
  async generateKeys(@CurrentUser() user: JwtPayload) {
    const keyPairs = await this.keyService.generateKey(user);
    return keyPairs;
  }
}
