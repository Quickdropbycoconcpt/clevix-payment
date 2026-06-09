import { Module } from '@nestjs/common';
import { VfdModule } from 'src/infrastructure/payments/providers/vfd/vfd.module';
import { CollectionAdapterFactory } from '../adapters/collection.adapter.factory';
import { PosController } from './controllers/pos.controllers';
import { PosService } from './service/pos.service';

@Module({
  imports: [VfdModule],
  controllers: [PosController],
  providers: [CollectionAdapterFactory, PosService],
})
export class PosModule {}
