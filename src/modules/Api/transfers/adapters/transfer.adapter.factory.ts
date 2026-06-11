import { BadRequestException, Injectable } from '@nestjs/common';
import { TransferAdapter } from './contracts/transfer.adapter';
import { TransferProvider } from '../types/transfer-provider';
import { VfdTransferProvider } from 'src/infrastructure/payments/providers/vfd/vfd-adapter/vfd-transfer-adapter';

@Injectable()
export class TransferAdapterFactory {
  private readonly transferAdapters = new Map<
    TransferProvider,
    TransferAdapter
  >();

  constructor(private readonly vfdTransferAdapter: VfdTransferProvider) {
    this.transferAdapters.set(TransferProvider.VFD, this.vfdTransferAdapter);
  }

  getTransferdapter(provider: string): TransferAdapter {
    const normalizedProvider = this.normalizeProvider(provider);
    const adapter = this.transferAdapters.get(normalizedProvider);

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
