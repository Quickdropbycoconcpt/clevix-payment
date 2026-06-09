import { Module } from '@nestjs/common';
import { VfdPosProvider } from './vfd-adapter/vfd-pos-adapter';
import { VfdVirtualAccountProvider } from './vfd-adapter/vfd-virtual-account-adapter';
import { VfdClient } from './vfd.client';

@Module({
  providers: [VfdVirtualAccountProvider, VfdPosProvider, VfdClient],
  exports: [VfdVirtualAccountProvider, VfdPosProvider],
})
export class VfdModule {}
