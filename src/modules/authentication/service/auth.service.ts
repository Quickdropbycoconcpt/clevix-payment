import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { JwtPayload } from '../interface/jwt-payload.interface';
import {
  ApiLoginDto,
  CreateAccountDto,
  LoginDto,
  ResetPasswordDto,
} from '../dto/auth.dto';
import { UserService } from 'src/modules/users/service/user.service';
import { KeysService } from 'src/modules/key-management/service/keys.service';
import * as argon from 'argon2';
import { TokenService } from 'src/modules/token-management/service/token.service';
import { ActionOwner, TokenNotificationType, TokenType } from 'src/shared/enum';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
    private readonly keyService: KeysService,
    private readonly tokenService: TokenService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: CreateAccountDto) {
    try {
      const account = await this.userService.setupNewAccount(dto);
      const token = this.tokenService.generateNumericToken(6);
      this.tokenService.generateToken({
        token,
        ownerId: account.userId,
        ownerType: ActionOwner.USER,
        recipientEmail: dto.email?.trim(),
        notificationType: TokenNotificationType.EMAIL,
        expiresAt: 60,
        type: TokenType.EMAIL_VERIFICATION,
      });
      const jwt = await this.dashBoardAccessToken({
        userId: account?.userId,
      });
      return { account, accessToken: jwt };
    } catch (error: any) {
      throw new BadRequestException(error?.message);
    }
  }

  async verifyEmailAddress(token: string) {
    const vToken = await this.tokenService.ValidateToken({
      token,
      ownerType: ActionOwner.USER,
      type: TokenType.EMAIL_VERIFICATION,
    });
    const result = await this.userService.verifyEmail(vToken.ownerId);
    return result;
  }

  /***
   * This is useful if user didn't get token or user left the screen
   */
  async requestNewEmailToken(email: string) {
    const account = await this.userService.dashBoardAuthentication(email);
    const token = this.tokenService.generateNumericToken(6);
    const saved = await this.tokenService.generateToken({
      token,
      ownerId: account.user.userId,
      ownerType: ActionOwner.USER,
      recipientEmail: email?.trim(),
      notificationType: TokenNotificationType.EMAIL,
      expiresAt: 60,
      type: TokenType.EMAIL_VERIFICATION,
    });
    return { tokenId: saved.tokenId };
  }

  async dashBoardAccessToken(
    payload: JwtPayload,
  ): Promise<{ accessToken: string; tokenType: 'Bearer'; expiresIn: string }> {
    return {
      accessToken: await this.jwtService.signAsync(payload, {
        secret: this.config.get('JWT_DASHBOARD_TOKEN_SECRET'),
      }),
      tokenType: 'Bearer',
      expiresIn: '24h',
    };
  }

  async signApiAccessToken(
    payload: JwtPayload,
    duration: number,
  ): Promise<{ accessToken: string; tokenType: 'Bearer'; expiresIn: string }> {
    const signOptions: JwtSignOptions = {
      secret: this.config.get<string>('JWT_API_TOKEN_SECRET'),
    };

    if (duration !== -1) {
      if (!Number.isFinite(duration) || duration <= 0) {
        throw new BadRequestException(
          'Duration must be -1 or a positive number of minutes',
        );
      }

      signOptions.expiresIn = `${duration}m`;
    }

    return {
      accessToken: await this.jwtService.signAsync(payload, signOptions),
      tokenType: 'Bearer',
      expiresIn: duration === -1 ? 'never' : `${duration}m`,
    };
  }

  async dashboardLogin(dto: LoginDto) {
    const account = await this.userService.dashBoardAuthentication(dto.email);

    if (!account?.user) {
      throw new BadRequestException('Account not found');
    }

    if (!account.user.isEmailVerified) {
      throw new BadRequestException(
        'Please verify your email address to proceed',
      );
    }

    const passwordValid = await argon.verify(
      account.user.password,
      dto.password,
    );

    if (!passwordValid) {
      throw new BadRequestException('Invalid credentials');
    }

    const token = await this.dashBoardAccessToken({
      userId: account?.user.userId,
    });

    return {
      ...token,
      businessId: account?.activeBusiness?.businessId,
      permissions: account.allowedPermissions.map((e) => e.permission.key),
      environment: account.environment,
    };
  }

  async apiLogin(dto: ApiLoginDto) {
    const result = await this.keyService.keyAuthentication({
      clientId: dto.clientId,
      secretKey: dto.secretKey,
    });

    const accessToken = await this.signApiAccessToken(
      { ...result, userId: 'api-key' },
      dto.duration,
    );

    return { accessToken };
  }

  async requestPasswordReset(dto: ResetPasswordDto) {
    const vToken = await this.tokenService.ValidateToken({
      token: dto.token,
      ownerType: ActionOwner.USER,
      type: TokenType.PASSWORD_RESET,
    });

    const result = await this.userService.resetPassword(
      vToken.ownerId,
      dto.newPassword,
    );

    return result;
  }
}
