import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { TransferService } from '../service/transfer.service';
import { WithdrawalDto } from '../dto/transfer.dto';
import { CurrentUser } from 'src/modules/authentication/decorators/current-user.decorator';
import type { JwtPayload } from 'src/modules/authentication/interface/jwt-payload.interface';
import { ApiJwtAuthGuard } from 'src/modules/authentication/guards/api-guard';

@ApiTags('DISURSEMENT API')
@Controller('disbursement')
@ApiBearerAuth('bearer')
@UseGuards(ApiJwtAuthGuard)
export class TransferController {
  constructor(private readonly transferService: TransferService) {}

  @Post('single')
  async inititatePayout(
    @Body() body: WithdrawalDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return await this.transferService.processPayout(body, user);
  }
}
