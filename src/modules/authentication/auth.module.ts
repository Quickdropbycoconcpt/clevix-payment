import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { KeysManagementModule } from '../key-management/keys-management.module';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthService } from './service/auth.service';
import { UserModule } from '../users/users.module';
import { AuthControllers } from './controllers/auth.controllers';
import { BusinessContextGuard } from './guards/business-context.guard';
import { BusinessMembersModule } from '../business-members/business-members.module';

@Module({
  imports: [
    KeysManagementModule,
    UserModule,
    BusinessMembersModule,

    JwtModule.registerAsync({
      global: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (): JwtModuleOptions => ({
        signOptions: {
          algorithm: 'HS256',
        },
      }),
    }),
  ],
  controllers: [AuthControllers],
  providers: [AuthService, JwtAuthGuard, BusinessContextGuard],
  exports: [AuthService, JwtModule, JwtAuthGuard, BusinessContextGuard],
})
export class AuthenticationModule {}
