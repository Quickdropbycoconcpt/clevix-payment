import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from '../service/auth.service';
import { ApiTags } from '@nestjs/swagger';
import {
  ApiLoginDto,
  CreateAccountDto,
  LoginDto,
  VerifyEmailDto,
} from '../dto/auth.dto';
import { Public } from '../decorators/public.decorator';

@ApiTags('Auth Management')
@Controller('auth')
export class AuthControllers {
  constructor(private readonly authService: AuthService) {}

  @Post('setup-account')
  async register(@Body() dto: CreateAccountDto) {
    const account = await this.authService.register(dto);
    return account;
  }

  @Post()
  @Public()
  async apiLogin(@Body() dto: ApiLoginDto) {
    const account = await this.authService.apiLogin(dto);
    return account;
  }

  @Post('verify-email')
  @Public()
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    const account = await this.authService.verifyEmailAddress(dto.otp);
    return account;
  }

  @Post('login')
  @Public()
  async dashboardAuth(@Body() dto: LoginDto) {
    const account = await this.authService.dashboardLogin(dto);
    return account;
  }
}
