import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from 'src/modules/authentication/decorators/current-user.decorator';
import { ApiJwtAuthGuard } from 'src/modules/authentication/guards/api-guard';
import type { JwtPayload } from 'src/modules/authentication/interface/jwt-payload.interface';
import { CreateDynamicVirtualAccountDto } from '../dto/create-dynamic-virtual-account.dto';
import { VirtualAccountsService } from '../service/virtual-accounts.service';
import { SimulateInwardCreditDto } from '../dto/simulate-credit.dto';
import { Public } from 'src/modules/authentication/decorators/public.decorator';
import {
  CreateCorporateStaticAccountDto,
  CreateIndividualStaticAccountDto,
} from '../dto/create-static-account.dto';

@ApiTags('API VIRTUAL ACCOUNT COLLECTION')
@Controller('collection')
@ApiBearerAuth('bearer')
@UseGuards(ApiJwtAuthGuard)
export class VirtualAccountsController {
  constructor(
    private readonly virtualAccountsService: VirtualAccountsService,
  ) {}

  @Post('dva')
  async generateDynamicVirtualAccount(
    @Body() dto: CreateDynamicVirtualAccountDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.virtualAccountsService.generateDynamicVirtualAccount(dto, user);
  }

  @Post('individual/static')
  async createIndividualStatic(
    @Body() dto: CreateIndividualStaticAccountDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.virtualAccountsService.createIndividualStaticAccount(dto, user);
  }

  @Post('corporate/static')
  async createCorporateStatic(
    @Body() dto: CreateCorporateStaticAccountDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.virtualAccountsService.createCorporateStaticAccount(dto, user);
  }

  @Post('credit')
  async simulateCredit(@Body() dto: SimulateInwardCreditDto) {
    return this.virtualAccountsService.simulateCredit(dto);
  }

  @Public()
  @Post(':provider/webhook')
  async webHook(@Body() dto: any, @Param('provider') provider: string) {
    return this.virtualAccountsService.incomingWebhook(dto, provider);
  }
}
