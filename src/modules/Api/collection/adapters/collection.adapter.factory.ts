import { BadRequestException, Injectable } from '@nestjs/common';
import { VfdPosProvider } from 'src/infrastructure/payments/providers/vfd/vfd-adapter/vfd-pos-adapter';
import { VfdVirtualAccountProvider } from 'src/infrastructure/payments/providers/vfd/vfd-adapter/vfd-virtual-account-adapter';
import {
  CollectionProvider,
  CollectionSource,
} from './contracts/collection-adapter.types';
import { PosAdapter } from './contracts/pos.adapter';
import { VirtualAccountAdapter } from './contracts/virtual-account.adapter';

@Injectable()
export class CollectionAdapterFactory {
  private readonly virtualAccountAdapters = new Map<
    CollectionProvider,
    VirtualAccountAdapter
  >();
  private readonly posAdapters = new Map<CollectionProvider, PosAdapter>();

  constructor(
    private readonly vfdVirtualAccountProvider: VfdVirtualAccountProvider,
    private readonly vfdPosProvider: VfdPosProvider,
  ) {
    this.virtualAccountAdapters.set(
      CollectionProvider.VFD,
      this.vfdVirtualAccountProvider,
    );
    this.posAdapters.set(CollectionProvider.VFD, this.vfdPosProvider);
  }

  getVirtualAccountAdapter(provider: string): VirtualAccountAdapter {
    const normalizedProvider = this.normalizeProvider(provider);
    const adapter = this.virtualAccountAdapters.get(normalizedProvider);

    if (!adapter) {
      throw new BadRequestException(
        `${normalizedProvider} does not support ${CollectionSource.VIRTUAL_ACCOUNT} collection`,
      );
    }

    return adapter;
  }

  getPosAdapter(provider: string): PosAdapter {
    const normalizedProvider = this.normalizeProvider(provider);
    const adapter = this.posAdapters.get(normalizedProvider);

    if (!adapter) {
      throw new BadRequestException(
        `${normalizedProvider} does not support ${CollectionSource.POS} collection`,
      );
    }

    return adapter;
  }

  private normalizeProvider(provider: string): CollectionProvider {
    const normalizedProvider = provider.trim().toLowerCase();

    if (
      Object.values(CollectionProvider).includes(
        normalizedProvider as CollectionProvider,
      )
    ) {
      return normalizedProvider as CollectionProvider;
    }

    throw new BadRequestException(
      `Unsupported collection provider: ${provider}`,
    );
  }
}
