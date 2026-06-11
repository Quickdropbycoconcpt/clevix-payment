import { Module } from '@nestjs/common';
import { VfdPosProvider } from './vfd-adapter/vfd-pos-adapter';
import { VfdVirtualAccountProvider } from './vfd-adapter/vfd-virtual-account-adapter';
import { VfdClient } from './vfd.client';
import { VfdTransferProvider } from './vfd-adapter/vfd-transfer-adapter';

@Module({
  providers: [
    VfdVirtualAccountProvider,
    VfdPosProvider,
    VfdTransferProvider,
    VfdClient,
  ],
  exports: [VfdVirtualAccountProvider, VfdPosProvider, VfdTransferProvider],
})
export class VfdModule {}
