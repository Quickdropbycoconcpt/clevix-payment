import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/authentication/guards/jwt-auth.guard';
import { BanksService } from 'src/modules/Api/banks/service/banks.service';

@ApiTags('Dashboard Banks')
@Controller('dashboard/banks')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard)
export class DashboardBanksController {
  constructor(private readonly banksService: BanksService) {}

  @Get()
  @ApiQuery({ name: 'name', required: false })
  async getBanks(@Query('name') name?: string) {
    return this.banksService.getBanks(name);
  }
}
