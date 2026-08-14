import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from 'src/modules/authentication/decorators/current-user.decorator';
import { JwtAuthGuard } from 'src/modules/authentication/guards/jwt-auth.guard';
import type { JwtPayload } from 'src/modules/authentication/interface/jwt-payload.interface';
import { Public } from 'src/modules/authentication/decorators/public.decorator';
import { getBusinessScope } from 'src/shared/business-scope';
import type { RequestScope } from 'src/shared/business-scope';
import { CreateServiceDto } from '../dto/create-service.dto';
import { ServiceCheckout } from '../service/service-checkout.service';
import { BusinessDashboardAuth } from 'src/modules/authentication/decorators/business-dashboard-auth.decorator';

@ApiTags('SERVICE CHECKOUT')
@Controller('v1/service-checkout')
@ApiBearerAuth('bearer')
export class ServiceCheckoutController {
  constructor(private readonly serviceCheckout: ServiceCheckout) {}

  @Public()
  @Get('businesses')
  async getBusinesses(@Query('name') name?: string) {
    return this.serviceCheckout.getBusinessesWithServices(name);
  }

  @Public()
  @Get('businesses/:businessId/services')
  async getBusinessServices(@Param('businessId') businessId: string) {
    return this.serviceCheckout.getOrganizationsServicesRendered(businessId);
  }

  @Public()
  @Get('services/:serviceId')
  async getServiceById(@Param('serviceId') serviceId: string) {
    return this.serviceCheckout.getServiceById(serviceId);
  }

  @Get('mandatory-fields')
  @UseGuards(JwtAuthGuard)
  async getMandatoryFields(@CurrentUser() user: JwtPayload) {
    const { environment } = getBusinessScope(user);

    return this.serviceCheckout.getMandatoryFields(environment);
  }

  @Post('services')
  @BusinessDashboardAuth()
  async createService(
    @Body() dto: CreateServiceDto,
    @CurrentUser() user: RequestScope,
  ) {
    const { businessId, environment } = getBusinessScope(user);
    return this.serviceCheckout.createService({
      ...dto,
      businessId,
      environment,
    });
  }

  @Get('services')
  @BusinessDashboardAuth()
  async getService(
    @CurrentUser() user: RequestScope,
    @Query('name') name: string,
  ) {
    const scope = getBusinessScope(user);
    return this.serviceCheckout.listServices(scope, name);
  }
}
