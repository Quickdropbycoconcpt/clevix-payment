import { Module } from '@nestjs/common';
import { KycAdapterFactory } from 'src/infrastructure/kyc/adapters/kyc.adapter.factory';
import { DojahKycProvider } from 'src/infrastructure/kyc/providers/dojah/dojah-kyc.adapter';
import { FcmbKycProvider } from 'src/infrastructure/kyc/providers/fcmb/fcmb-kyc.adapter';
import { VfdKycProvider } from 'src/infrastructure/kyc/providers/vfd/vfd-kyc.adapter';
import { KycController } from './controller/kyc.controllers';
import { KycService } from './service/kyc.service';
import { VfdClient } from 'src/infrastructure/payments/providers/vfd/vfd.client';

@Module({
  controllers: [KycController],
  providers: [
    KycAdapterFactory,
    VfdKycProvider,
    VfdClient,
    DojahKycProvider,
    FcmbKycProvider,
    KycService,
  ],
  exports: [KycAdapterFactory],
})
export class KycModule {}
