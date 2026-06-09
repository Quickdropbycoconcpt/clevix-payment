import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Key } from './entity/keys.entity';
import { KeysService } from './service/keys.service';
import { KeyControllers } from './controllers/keys.controllers';
import { BusinessMembersModule } from '../business-members/business-members.module';

@Module({
  imports: [TypeOrmModule.forFeature([Key]), BusinessMembersModule],
  providers: [KeysService],
  controllers: [KeyControllers],
  exports: [KeysService],
})
export class KeysManagementModule {}
