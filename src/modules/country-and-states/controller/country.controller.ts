import { Controller, Get, Param } from '@nestjs/common';
import { ApiParam, ApiTags } from '@nestjs/swagger';
import { Public } from 'src/modules/authentication/decorators/public.decorator';
import { CountryService } from '../service/country.service';

@ApiTags('Countries, States and Local Governments')
@Controller()
@Public()
export class CountryController {
  constructor(private readonly countryService: CountryService) {}

  @Get('countries')
  async getCountries() {
    return this.countryService.getCountries();
  }

  @Get('countries/:countryId/states')
  @ApiParam({ name: 'countryId' })
  async getStatesByCountry(@Param('countryId') countryId: string) {
    return this.countryService.getStatesByCountry(countryId);
  }

  @Get('states/:stateId/local-governments')
  @ApiParam({ name: 'stateId' })
  async getLocalGovernmentsByState(@Param('stateId') stateId: string) {
    return this.countryService.getLocalGovernmentsByState(stateId);
  }
}
