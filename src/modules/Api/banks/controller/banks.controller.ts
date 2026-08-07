import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ApiJwtAuthGuard } from 'src/modules/authentication/guards/api-guard';
import { BanksService } from '../service/banks.service';

@ApiTags('BANKS API')
@Controller('banks')
@ApiBearerAuth('bearer')
@UseGuards(ApiJwtAuthGuard)
export class BanksController {
  constructor(private readonly banksService: BanksService) {}

  @Get()
  @ApiQuery({ name: 'name', required: false })
  async getBanks(@Query('name') name?: string) {
    return this.banksService.getBanks(name);
  }
}
