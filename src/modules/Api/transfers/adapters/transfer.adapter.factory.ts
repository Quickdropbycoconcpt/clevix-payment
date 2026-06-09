import { BadRequestException, Injectable } from '@nestjs/common';
import { VfdPosProvider } from 'src/infrastructure/payments/providers/vfd/vfd-adapter/vfd-pos-adapter';

import { NairaTransferAdapter } from './contracts/transfer.adapter';
import { TransferProvider } from '../types/transfer-provider';
import { VfdTransferAdapter } from 'src/infrastructure/payments/providers/vfd/vfd-adapter/vfd-transfer-adapter';

@Injectable()
export class TransferAdapterFactory {
  private readonly virtualAccountAdapters = new Map<
    TransferProvider,
    NairaTransferAdapter
  >();

  constructor(
    private readonly vfdVirtualAccountProvider: VfdTransferAdapter,
    private readonly vfdPosProvider: VfdPosProvider,
  ) {
    this.virtualAccountAdapters.set(
      TransferProvider.VFD,
      this.vfdVirtualAccountProvider,
    );
  }

  getNairaTransferdapter(provider: string): VfdTransferAdapter {
    const normalizedProvider = this.normalizeProvider(provider);
    const adapter = this.virtualAccountAdapters.get(normalizedProvider);

    if (!adapter) {
      throw new BadRequestException(
        `${normalizedProvider} does not support transfer`,
      );
    }

    return adapter;
  }

  private normalizeProvider(provider: string): TransferProvider {
    const normalizedProvider = provider.trim().toLowerCase();

    if (
      Object.values(TransferProvider).includes(
        normalizedProvider as TransferProvider,
      )
    ) {
      return normalizedProvider as TransferProvider;
    }

    throw new BadRequestException(
      `Unsupported collection provider: ${provider}`,
    );
  }
}
