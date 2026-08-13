import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiParam, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/authentication/guards/jwt-auth.guard';
import {
  CreateTaxConfigurationDto,
  CreateTaxSettlementDestinationDto,
  TaxConfigurationQueryDto,
  UpdateTaxConfigurationDto,
  UpdateTaxSettlementDestinationDto,
} from '../dto/tax-configuration.dto';
import { TaxManagementService } from '../service/tax-management.service';

@ApiTags('Dashboard Tax Management')
@Controller('dashboard/tax-management')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard)
export class TaxManagementController {
  constructor(private readonly taxManagementService: TaxManagementService) {}

  @Post('configurations')
  async createTaxConfiguration(@Body() dto: CreateTaxConfigurationDto) {
    return this.taxManagementService.createTaxConfiguration(dto);
  }

  @Get('configurations')
  async getTaxConfigurations(@Query() query: TaxConfigurationQueryDto) {
    return this.taxManagementService.getTaxConfigurations(query);
  }

  @Get('configurations/:taxId')
  @ApiParam({ name: 'taxId' })
  async getTaxConfiguration(@Param('taxId') taxId: string) {
    return this.taxManagementService.getTaxConfiguration(taxId);
  }

  @Patch('configurations/:taxId')
  @ApiParam({ name: 'taxId' })
  async updateTaxConfiguration(
    @Param('taxId') taxId: string,
    @Body() dto: UpdateTaxConfigurationDto,
  ) {
    return this.taxManagementService.updateTaxConfiguration(taxId, dto);
  }

  @Post('configurations/:taxId/destinations')
  @ApiParam({ name: 'taxId' })
  async addTaxSettlementDestination(
    @Param('taxId') taxId: string,
    @Body() dto: CreateTaxSettlementDestinationDto,
  ) {
    return this.taxManagementService.addTaxSettlementDestination(taxId, dto);
  }

  @Get('configurations/:taxId/destinations')
  @ApiParam({ name: 'taxId' })
  async getTaxSettlementDestinations(@Param('taxId') taxId: string) {
    return this.taxManagementService.getTaxSettlementDestinations(taxId);
  }

  @Patch('configurations/:taxId/destinations/:taxSettlementDestinationId')
  @ApiParam({ name: 'taxId' })
  @ApiParam({ name: 'taxSettlementDestinationId' })
  async updateTaxSettlementDestination(
    @Param('taxId') taxId: string,
    @Param('taxSettlementDestinationId') taxSettlementDestinationId: string,
    @Body() dto: UpdateTaxSettlementDestinationDto,
  ) {
    return this.taxManagementService.updateTaxSettlementDestination(
      taxId,
      taxSettlementDestinationId,
      dto,
    );
  }
}
