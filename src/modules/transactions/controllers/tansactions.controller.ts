import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from 'src/modules/authentication/decorators/current-user.decorator';
import { ApiJwtAuthGuard } from 'src/modules/authentication/guards/api-guard';
import type { JwtPayload } from 'src/modules/authentication/interface/jwt-payload.interface';
import { TransactionStatusQueryDto } from '../dto/transaction-status.dto';
import { TransactionService } from '../service/transaction.service';

@ApiTags('API Transactions')
@ApiBearerAuth('bearer')
@Controller('transactions')
@UseGuards(ApiJwtAuthGuard)
export class TransactionsController {
  constructor(private readonly transactionService: TransactionService) {}

  @Get('status/:reference')
  async getTransactionStatusByReference(
    @Param('reference') reference: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.transactionService.getTransactionStatus({
      reference,
      businessId: user.businessId,
      environment: user.environment,
    });
  }
}
