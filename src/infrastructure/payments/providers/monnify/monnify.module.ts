import { Module } from '@nestjs/common';
import { MonnifyClient } from './monnify.client';
import { MonnifyTransferProvider } from './monnify-adapter/monnify-transfer-adapter';
import { MonnifyVirtualAccountProvider } from './monnify-adapter/monnify-virtual-account-adapter';
import { MonnifyCardProvider } from './monnify-adapter/monnify-card-payment.adapter';
import { MonnifyBanksManagementAdapter } from './monnify-adapter/monnify-banks-adapter';

@Module({
  providers: [
    MonnifyClient,
    MonnifyTransferProvider,
    MonnifyVirtualAccountProvider,
    MonnifyCardProvider,
    MonnifyBanksManagementAdapter,
  ],
  exports: [
    MonnifyClient,
    MonnifyTransferProvider,
    MonnifyVirtualAccountProvider,
    MonnifyCardProvider,
    MonnifyBanksManagementAdapter,
  ],
})
export class MonnifyModule {}
