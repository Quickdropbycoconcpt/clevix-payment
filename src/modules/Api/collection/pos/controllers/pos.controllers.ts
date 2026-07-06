import {
  Body,
  Controller,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from 'src/modules/authentication/decorators/current-user.decorator';
import { ApiJwtAuthGuard } from 'src/modules/authentication/guards/api-guard';
import type { JwtPayload } from 'src/modules/authentication/interface/jwt-payload.interface';
import { ChargePosDto } from '../dto/charge-pos.dto';
import { CreateTerminalDto } from '../dto/create-terminal.dto';
import { PosService } from '../service/pos.service';
import { PosTerminalService } from '../service/pos_terminal.service';
import { Public } from 'src/modules/authentication/decorators/public.decorator';
import { JwtAuthGuard } from 'src/modules/authentication/guards/jwt-auth.guard';

@ApiTags('API POS COLLECTION')
@Controller('collection/pos')
@ApiBearerAuth('bearer')
export class PosController {
  constructor(
    private readonly posService: PosService,
    private readonly posTerminalService: PosTerminalService,
  ) {}

  @Post('charge')
  @UseGuards(ApiJwtAuthGuard)
  async chargePos(@Body() dto: ChargePosDto, @CurrentUser() user: JwtPayload) {
    return this.posService.chargePos(dto, user);
  }

  @Post('terminals')
  @UseGuards(JwtAuthGuard)
  async addTerminal(
    @Body() dto: CreateTerminalDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.posTerminalService.addTerminal(dto, user);
  }

  @Patch('terminals/:terminalId/activate')
  @UseGuards(JwtAuthGuard)
  async activateTerminal(
    @Param('terminalId') terminalId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.posTerminalService.activateTerminal(terminalId, user);
  }

  @Patch('terminals/:terminalId/deactivate')
  @UseGuards(JwtAuthGuard)
  async deactivateTerminal(
    @Param('terminalId') terminalId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.posTerminalService.deactivateTerminal(terminalId, user);
  }

  @Public()
  @Post(':provider/webhook')
  async incomingWebhook(
    @Body() body: any,
    @Param('provider') provider: string,
  ) {
    return this.posService.incomingWebhook(body, provider);
  }
}
