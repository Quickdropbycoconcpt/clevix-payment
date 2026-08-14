import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiParam, ApiTags } from '@nestjs/swagger';
import { BusinessDashboardAuth } from 'src/modules/authentication/decorators/business-dashboard-auth.decorator';
import { CurrentUser } from 'src/modules/authentication/decorators/current-user.decorator';
import type { JwtPayload } from 'src/modules/authentication/interface/jwt-payload.interface';
import { TaxTransactionQueryDto } from '../dto/tax-configuration.dto';
import { TaxManagementService } from '../service/tax-management.service';

@ApiTags('Business Tax Management')
@ApiBearerAuth('bearer')
@Controller('v1/tax-management')
@BusinessDashboardAuth()
export class BusinessTaxManagementController {
  constructor(private readonly taxManagementService: TaxManagementService) {}

  @Get('transactions')
  async getTaxTransactions(
    @CurrentUser() user: JwtPayload,
    @Query() query: TaxTransactionQueryDto,
  ) {
    return this.taxManagementService.getBusinessTaxTransactions(user, query);
  }

  @Get('transactions/:taxTransactionId')
  @ApiParam({ name: 'taxTransactionId' })
  async getTaxTransaction(
    @CurrentUser() user: JwtPayload,
    @Param('taxTransactionId') taxTransactionId: string,
  ) {
    return this.taxManagementService.getBusinessTaxTransaction(
      user,
      taxTransactionId,
    );
  }
}
