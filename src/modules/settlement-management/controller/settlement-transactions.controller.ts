import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from 'src/modules/authentication/decorators/current-user.decorator';
import type { JwtPayload } from 'src/modules/authentication/interface/jwt-payload.interface';
import { BusinessDashboardAuth } from 'src/modules/authentication/decorators/business-dashboard-auth.decorator';
import { SettlementTransactionsService } from '../service/settlement-transactions.service';
import { ListSettlementsQueryDto } from '../dto/list-settlements-query.dto';

@Controller('v1/settlement')
@ApiTags('Settlement Transactions Management')
@ApiBearerAuth('bearer')
@BusinessDashboardAuth()
export class SettlementTransactionsController {
  constructor(
    private readonly settlementTransactionsService: SettlementTransactionsService,
  ) {}

  @Get()
  async listSettlements(
    @CurrentUser() user: JwtPayload,
    @Query() query: ListSettlementsQueryDto,
  ) {
    return this.settlementTransactionsService.listSettlements(user, query);
  }

  @Get(':settlementId/transactions')
  async listSettlementTransactions(
    @CurrentUser() user: JwtPayload,
    @Param('settlementId', ParseUUIDPipe) settlementId: string,
  ) {
    return this.settlementTransactionsService.listSettlementTransactions(
      user,
      settlementId,
    );
  }
}
