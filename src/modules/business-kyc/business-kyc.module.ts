import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BusinessRepresentatives } from './entity/business-reps.entity';
import { BusinessDocuments } from './entity/business-documents.entity';
import { BusinessInformation } from './entity/business-information.entity';
import { BusinessKycService } from './service/business-kyc.service';
import { BusinessKycController } from './controller/business-kyc.controller';
import { BusinessModule } from '../businesses/business.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BusinessRepresentatives,
      BusinessDocuments,
      BusinessInformation,
    ]),
    BusinessModule,
  ],
  providers: [BusinessKycService],
  exports: [BusinessKycService],
  controllers: [BusinessKycController],
})
export class BusinessKycModule {}
