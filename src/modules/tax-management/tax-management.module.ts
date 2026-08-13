import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaxConfiguration } from './entity/tax-config.entity';
import { TaxSettlementDestination } from './entity/tax-settlement-destination.entity';
import { TaxTransaction } from './entity/tax-transaction.entity';
import { TaxManagementService } from './service/tax-management.service';
import { TaxManagementController } from './controller/tax-management.controller';
import { BusinessTaxManagementController } from './controller/business-tax-management.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TaxConfiguration,
      TaxSettlementDestination,
      TaxTransaction,
    ]),
  ],
  controllers: [TaxManagementController, BusinessTaxManagementController],
  providers: [TaxManagementService],
  exports: [TypeOrmModule, TaxManagementService],
})
export class TaxManagementModule {}
