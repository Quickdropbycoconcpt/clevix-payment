import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Public } from 'src/modules/authentication/decorators/public.decorator';
import { InvoiceCreationDto } from '../dto/org_invoice.dto';
import { PayInvoiceDto } from '../dto/pay-invoice.dto';
import { OrganisationInvoiceService } from '../service/org_invoice.service';
import { SupportedPaymentMethod } from '../entity/invoice_transaction.entity';
import { BusinessDashboardAuth } from 'src/modules/authentication/decorators/business-dashboard-auth.decorator';

@ApiTags('SERVICE CHECKOUT INVOICE')
@Controller('checkout/invoice')
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

  @Public()
  @Get(':reference/fee')
  async previewFee(
    @Param('reference') reference: string,
    @Query('method') method: SupportedPaymentMethod,
  ) {
    return this.service.previewFee(reference, method);
  }

  @Public()
  @Post('pay')
  async payInvoice(@Body() dto: PayInvoiceDto) {
    return this.service.payInvoice(dto);
  }
}
