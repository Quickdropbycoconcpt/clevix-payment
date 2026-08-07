import { Module } from '@nestjs/common';
import { VfdPosProvider } from './vfd-adapter/vfd-pos-adapter';
import { VfdVirtualAccountProvider } from './vfd-adapter/vfd-virtual-account-adapter';
import { VfdClient } from './vfd.client';
import { VfdTransferProvider } from './vfd-adapter/vfd-transfer-adapter';
import { VfdCardProvider } from './vfd-adapter/vfd-card-payment.adapter';
import { VfdBanksManagementAdapter } from './vfd-adapter/vfd-banks-adapter';

@Module({
  providers: [
    VfdVirtualAccountProvider,
    VfdPosProvider,
    VfdTransferProvider,
    VfdCardProvider,
    VfdBanksManagementAdapter,
    VfdClient,
  ],
  exports: [
    VfdVirtualAccountProvider,
    VfdPosProvider,
    VfdTransferProvider,
    VfdCardProvider,
    VfdBanksManagementAdapter,
    VfdClient,
  ],
})
export class VfdModule {}
