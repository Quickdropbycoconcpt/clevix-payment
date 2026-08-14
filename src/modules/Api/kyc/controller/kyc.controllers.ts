import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from 'src/modules/authentication/decorators/current-user.decorator';
import { ApiJwtAuthGuard } from 'src/modules/authentication/guards/api-guard';
import type { JwtPayload } from 'src/modules/authentication/interface/jwt-payload.interface';
import { BvnImageMatchDto } from '../dto/bvn-image-match.dto';
import { VerifyBvnDto } from '../dto/verify-bvn.dto';
import { VerifyNinDto } from '../dto/verify-nin.dto';
import { KycService } from '../service/kyc.service';

@ApiTags('KYC Management')
@Controller('v1/kyc')
@ApiBearerAuth('bearer')
@UseGuards(ApiJwtAuthGuard)
export class KycController {
  constructor(private readonly kycService: KycService) {}

  @Post('bvn/verify')
  async verifyBvn(@Body() dto: VerifyBvnDto, @CurrentUser() user: JwtPayload) {
    return this.kycService.verifyBvn(dto, user);
  }

  @Post('nin/verify')
  async verifyNin(@Body() dto: VerifyNinDto, @CurrentUser() user: JwtPayload) {
    return this.kycService.verifyNin(dto, user);
  }

  @Post('bvn/image-match')
  async bvnImageMatch(
    @Body() dto: BvnImageMatchDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.kycService.bvnImageMatch(dto, user);
  }
}
