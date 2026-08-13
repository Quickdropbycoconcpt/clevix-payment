import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from 'src/modules/authentication/decorators/current-user.decorator';
import type { JwtPayload } from 'src/modules/authentication/interface/jwt-payload.interface';
import { getBusinessScope } from 'src/shared/business-scope';
import { AddSettlementBankDto } from '../dto/settlement.dto';
import { SettlementService } from '../service/settlement.account.service';
import { BusinessDashboardAuth } from 'src/modules/authentication/decorators/business-dashboard-auth.decorator';

@Controller('settlement')
@ApiTags('Settlement Management')
@ApiBearerAuth('bearer')
@BusinessDashboardAuth()
export class SettlementController {
  constructor(private readonly settlementService: SettlementService) {}

  @Post('accounts')
  async addBankAccount(
    @Body() dto: AddSettlementBankDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.settlementService.addSettlementBankAccount(
      dto,
      getBusinessScope(user),
    );
  }

  @Delete('accounts/:settlementAccountId')
  async removeSettlementAccount(
    @Param('settlementAccountId') settlementAccountId: string,
  ) {
    return this.settlementService.removeSettlementAccount(settlementAccountId);
  }

  @Get('accounts')
  async getSettlementAccounts(
    @CurrentUser() user: JwtPayload,
    @Query('name') name?: string,
  ) {
    return this.settlementService.getSettlementAccounts(
      getBusinessScope(user),
      name,
    );
  }
}
