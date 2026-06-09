import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Country } from './entity/country.entity';
import { LocalGovernment } from './entity/local-government.entity';
import { State } from './entity/state.entity';
import { CountryService } from './service/country.service';

@Module({
  imports: [TypeOrmModule.forFeature([Country, State, LocalGovernment])],
  providers: [CountryService],
  exports: [CountryService],
})
export class CountryModule {}
