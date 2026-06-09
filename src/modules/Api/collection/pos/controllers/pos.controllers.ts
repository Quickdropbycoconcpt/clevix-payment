import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from 'src/modules/authentication/decorators/current-user.decorator';
import { ApiJwtAuthGuard } from 'src/modules/authentication/guards/api-guard';
import type { JwtPayload } from 'src/modules/authentication/interface/jwt-payload.interface';
import { ChargePosDto } from '../dto/charge-pos.dto';
import { PosService } from '../service/pos.service';

@ApiTags('API POS COLLECTION')
@Controller('collection/pos')
@ApiBearerAuth('bearer')
@UseGuards(ApiJwtAuthGuard)
export class PosController {
  constructor(private readonly posService: PosService) {}

  @Post('charge')
  async chargePos(@Body() dto: ChargePosDto, @CurrentUser() user: JwtPayload) {
    return this.posService.chargePos(dto, user);
  }
}
