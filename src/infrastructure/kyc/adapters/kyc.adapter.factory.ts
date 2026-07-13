import { BadRequestException, Injectable } from '@nestjs/common';
import { DojahKycProvider } from '../providers/dojah/dojah-kyc.adapter';
import { FcmbKycProvider } from '../providers/fcmb/fcmb-kyc.adapter';
import { VfdKycProvider } from '../providers/vfd/vfd-kyc.adapter';
import { KycAdapter, KycProvider } from './kyc.adapter';

@Injectable()
export class KycAdapterFactory {
  private readonly kycAdapters = new Map<KycProvider, KycAdapter>();

  constructor(
    private readonly vfdKycProvider: VfdKycProvider,
    private readonly dojahKycProvider: DojahKycProvider,
    private readonly fcmbKycProvider: FcmbKycProvider,
  ) {
    this.kycAdapters.set(KycProvider.VFD, this.vfdKycProvider);
    this.kycAdapters.set(KycProvider.DOJAH, this.dojahKycProvider);
    this.kycAdapters.set(KycProvider.FCMB, this.fcmbKycProvider);
  }

  getKycAdapter(provider: string): KycAdapter {
    const normalizedProvider = this.normalizeProvider(provider);
    const adapter = this.kycAdapters.get(normalizedProvider);

    if (!adapter) {
      throw new BadRequestException(
        `${normalizedProvider} does not support KYC verification`,
      );
    }

    return adapter;
  }

  private normalizeProvider(provider: string): KycProvider {
    const normalizedProvider = provider.trim().toLowerCase();

    if (
      Object.values(KycProvider).includes(normalizedProvider as KycProvider)
    ) {
      return normalizedProvider as KycProvider;
    }

    throw new BadRequestException(`Unsupported KYC provider: ${provider}`);
  }
}
