import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from 'src/modules/authentication/decorators/current-user.decorator';

import type { RequestScope } from 'src/shared/business-scope';
import { TransactionsServiceListing } from '../service/list-transactions.service';
import { BusinessDashboardAuth } from 'src/modules/authentication/decorators/business-dashboard-auth.decorator';

@ApiTags('Dashboard Transactions')
@ApiBearerAuth('bearer')
@Controller('dashboard/transactions')
@BusinessDashboardAuth()
export class DashboardTransactionsController {
  constructor(private readonly listTxnService: TransactionsServiceListing) {}

  @Get()
  async listTransactions(@CurrentUser() scope: RequestScope) {
    return this.listTxnService.listTransactions(scope);
  }
}
