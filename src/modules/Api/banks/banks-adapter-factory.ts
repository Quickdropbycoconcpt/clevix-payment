import { BadRequestException, Injectable } from '@nestjs/common';
import {
  BankDirectoryAdapter,
  BankProvider,
} from './adapters/banks.adapter';
import { VfdBanksManagementAdapter } from 'src/infrastructure/payments/providers/vfd/vfd-adapter/vfd-banks-adapter';

@Injectable()
export class BanksAdapterFactory {
  private readonly bankAdapters = new Map<BankProvider, BankDirectoryAdapter>();

  constructor(private readonly vfdBanksAdapter: VfdBanksManagementAdapter) {
    this.bankAdapters.set(BankProvider.VFD, this.vfdBanksAdapter);
  }

  getBankAdapter(provider: string): BankDirectoryAdapter {
    const normalizedProvider = this.normalizeProvider(provider);
    const adapter = this.bankAdapters.get(normalizedProvider);

    if (!adapter) {
      throw new BadRequestException(
        `${normalizedProvider} does not support bank directory lookup`,
      );
    }

    return adapter;
  }

  private normalizeProvider(provider: string): BankProvider {
    const normalizedProvider = provider.trim().toLowerCase();

    if (
      Object.values(BankProvider).includes(normalizedProvider as BankProvider)
    ) {
      return normalizedProvider as BankProvider;
    }

    throw new BadRequestException(`Unsupported bank provider: ${provider}`);
  }
}
