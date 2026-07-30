import { BadRequestException, Injectable } from '@nestjs/common';
import { VfdPosProvider } from 'src/infrastructure/payments/providers/vfd/vfd-adapter/vfd-pos-adapter';
import { VfdVirtualAccountProvider } from 'src/infrastructure/payments/providers/vfd/vfd-adapter/vfd-virtual-account-adapter';
import {
  CollectionProvider,
  CollectionSource,
} from './contracts/collection-adapter.types';
import { PosAdapter } from './contracts/pos.adapter';
import { VirtualAccountAdapter } from './contracts/virtual-account.adapter';
import { VfdCardProvider } from 'src/infrastructure/payments/providers/vfd/vfd-adapter/vfd-card-payment.adapter';
import { CardPaymentAdapter } from './contracts/card-payment.adapter';

@Injectable()
export class CollectionAdapterFactory {
  private readonly virtualAccountAdapters = new Map<
    CollectionProvider,
    VirtualAccountAdapter
  >();
  private readonly posAdapters = new Map<CollectionProvider, PosAdapter>();

  private readonly cardAdapters = new Map<
    CollectionProvider,
    CardPaymentAdapter
  >();

  constructor(
    private readonly vfdVirtualAccountProvider: VfdVirtualAccountProvider,
    private readonly vfdPosProvider: VfdPosProvider,
    private readonly vfdCardProvider: VfdCardProvider,
  ) {
    this.virtualAccountAdapters.set(
      CollectionProvider.VFD,
      this.vfdVirtualAccountProvider,
    );
    this.posAdapters.set(CollectionProvider.VFD, this.vfdPosProvider);
    this.cardAdapters.set(CollectionProvider.VFD, this.vfdCardProvider);
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

  getCardPaymentAdapter(provider: string): CardPaymentAdapter {
    const normalizedProvider = this.normalizeProvider(provider);
    const adapter = this.cardAdapters.get(normalizedProvider);

    if (!adapter) {
      throw new BadRequestException(
        `${normalizedProvider} does not support ${CollectionSource.CARD} collection`,
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
