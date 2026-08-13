import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { BusinessDashboardAuth } from 'src/modules/authentication/decorators/business-dashboard-auth.decorator';
import { CurrentUser } from 'src/modules/authentication/decorators/current-user.decorator';
import type { RequestScope } from 'src/shared/business-scope';
import { WalletTransactionsService } from '../service/wallet.transactions.service';
import { WalletTransactionQueryDto } from '../dto/wallets.dto';

@ApiTags('Wallets')
@Controller('wallets')
@BusinessDashboardAuth()
export class WalletController {
  constructor(
    private readonly walletTransactionsService: WalletTransactionsService,
  ) {}

  @Get('transactions')
  async getTransactions(
    @CurrentUser() scope: RequestScope,
    @Query() query: WalletTransactionQueryDto,
  ) {
    return this.walletTransactionsService.getTransactions(scope, query);
  }

  @Get('wallets')
  async wallets(@CurrentUser() scope: RequestScope) {
    return this.walletTransactionsService.getWallets(scope);
  }
}
