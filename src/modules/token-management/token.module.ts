import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Token } from './entity/token.entity';
import { TokenService } from './service/token.service';
import { User } from '../users/entity/user.entity';
import { Businesses } from '../businesses/entity/business.entity';
import { NotificationModule } from 'src/infrastructure/notification/notification.module';
import { TokenController } from './controller/token.controller';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([Token, User, Businesses]),
    NotificationModule,
  ],
  controllers: [TokenController],
  providers: [TokenService],
  exports: [TokenService],
})
export class TokenModule {}
