import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Businesses } from './entity/business.entity';
import { BusinessService } from './service/business.service';

@Module({
  imports: [TypeOrmModule.forFeature([Businesses])],
  providers: [BusinessService],
  exports: [BusinessService],
})
export class BusinessModule {}
