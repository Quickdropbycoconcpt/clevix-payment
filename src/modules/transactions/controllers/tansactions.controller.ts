import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { TransactionService } from '../service/transaction.service';
import { TransactionsServiceListing } from '../service/list-transactions.service';
import { Public } from 'src/modules/authentication/decorators/public.decorator';

@ApiTags('API Transactions')
@Controller('v1/transactions')
export class TransactionsController {
  constructor(
    private readonly transactionService: TransactionService,
    private readonly listTxnService: TransactionsServiceListing,
  ) {}

  @Public()
  @Get('status/:reference')
  async getTransactionStatusByReference(
    @Param('reference') reference: string,
    @Query('businessId') businessId: string,
  ) {
    return this.transactionService.getTransactionStatus({
      reference,
      businessId,
    });
  }
}
