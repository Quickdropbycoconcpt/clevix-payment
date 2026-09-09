import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Public } from 'src/modules/authentication/decorators/public.decorator';
import { InvoiceCreationDto } from '../dto/org_invoice.dto';
import { PayInvoiceDto } from '../dto/pay-invoice.dto';
import { OrganisationInvoiceService } from '../service/org_invoice.service';
import { SupportedPaymentMethod } from '../entity/invoice_transaction.entity';
import { InvoiceStatus } from '../entity/service_checkout_invoice.entity';
import { BusinessDashboardAuth } from 'src/modules/authentication/decorators/business-dashboard-auth.decorator';
import { CurrentUser } from 'src/modules/authentication/decorators/current-user.decorator';
import type { RequestScope } from 'src/shared/business-scope';

@ApiTags('SERVICE CHECKOUT INVOICE')
@Controller('v1/checkout/invoice')
export class ServiceInvoiceCheckoutController {
  constructor(private readonly service: OrganisationInvoiceService) {}

  @Public()
  @Post('create')
  async createInvoice(@Body() dto: InvoiceCreationDto) {
    return this.service.createInvoice(dto);
  }

  @Post('dashboard-create')
  @BusinessDashboardAuth()
  @ApiBearerAuth('bearer')
  async dashboardInvoiceCreation(@Body() dto: InvoiceCreationDto) {
    return this.service.createInvoice(dto);
  }

  @Get()
  @BusinessDashboardAuth()
  @ApiBearerAuth('bearer')
  async listInvoices(
    @CurrentUser() user: RequestScope,
    @Query('status') status?: InvoiceStatus,
    @Query('reference') reference?: string,
  ) {
    return this.service.listInvoices(user, { status, reference });
  }

  @Public()
  @Get(':reference/fee')
  async previewFee(
    @Param('reference') reference: string,
    @Query('method') method: SupportedPaymentMethod,
  ) {
    return this.service.previewFee(reference, method);
  }

  @Get(':reference/transactions')
  @BusinessDashboardAuth()
  @ApiBearerAuth('bearer')
  async listInvoiceTransactions(
    @Param('reference') reference: string,
    @CurrentUser() user: RequestScope,
  ) {
    return this.service.listInvoiceTransactions(user, reference);
  }

  @Public()
  @Post('pay')
  async payInvoice(@Body() dto: PayInvoiceDto) {
    return this.service.payInvoice(dto);
  }
}
