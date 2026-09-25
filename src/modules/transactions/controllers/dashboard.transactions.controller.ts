import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from 'src/modules/authentication/decorators/current-user.decorator';

import type { RequestScope } from 'src/shared/business-scope';
import { ListTransactionsQueryDto } from '../dto/list-transactions-query.dto';
import { TransactionsServiceListing } from '../service/list-transactions.service';
import { BusinessDashboardAuth } from 'src/modules/authentication/decorators/business-dashboard-auth.decorator';

@ApiTags('Dashboard Transactions')
@ApiBearerAuth('bearer')
@Controller('v1/dashboard/transactions')
@BusinessDashboardAuth()
export class DashboardTransactionsController {
  constructor(private readonly listTxnService: TransactionsServiceListing) {}

  @Get()
  async listTransactions(
    @CurrentUser() scope: RequestScope,
    @Query() query: ListTransactionsQueryDto,
  ) {
    return this.listTxnService.listTransactions(scope, query);
  }

  @Get('details/:transactionId')
  async getTransactionDetails(
    @CurrentUser() scope: RequestScope,
    @Param('transactionId', ParseUUIDPipe) transactionId: string,
  ) {
    return this.listTxnService.getTransactionDetails(scope, transactionId);
  }
}
