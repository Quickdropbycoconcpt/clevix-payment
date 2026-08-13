import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { TokenService } from '../service/token.service';
import {
  RequestTokenByEmailDto,
  ResendTokenDto,
} from '../dto/resend-token.dto';

@ApiTags('Token Management')
@Controller('token')
export class TokenController {
  constructor(private readonly tokenService: TokenService) {}

  @Post('resend')
  async resendToken(@Body() dto: ResendTokenDto) {
    const result = await this.tokenService.resendByPreviousToken(
      dto.previousTokenId,
    );
    return result;
  }

  @Post('request-by-email')
  async requestTokenByEmail(@Body() dto: RequestTokenByEmailDto) {
    const result = await this.tokenService.requestTokenByEmail(dto);
    return result;
  }
}
