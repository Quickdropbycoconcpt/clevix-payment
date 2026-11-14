import { Injectable } from '@nestjs/common';
import {
  BvnImageMatchResult,
  KycAdapter,
  VerifyBvnResult,
  VerifyNinResult,
} from 'src/infrastructure/kyc/adapters/kyc.adapter';
import { KycAdapterFactory } from 'src/infrastructure/kyc/adapters/kyc.adapter.factory';
import { RequestScope, getBusinessScope } from 'src/shared/business-scope';
import { ProviderServiceType } from 'src/shared/enum';
import { ProviderService } from '../../providers/service/providers.service';
import { BvnImageMatchDto } from '../dto/bvn-image-match.dto';
import { VerifyBvnDto } from '../dto/verify-bvn.dto';
import { VerifyNinDto } from '../dto/verify-nin.dto';

@Injectable()
export class KycService {
  constructor(
    private readonly kycAdapterFactory: KycAdapterFactory,
    private readonly providerService: ProviderService,
  ) {}

  async verifyBvn(
    dto: VerifyBvnDto,
    scope: RequestScope,
  ): Promise<VerifyBvnResult> {
    const businessScope = getBusinessScope(scope);
    const adapter = await this.getActiveKycAdapter();

    return adapter.verifyBvn({
      ...businessScope,
      bvn: dto.bvn.trim(),
    });
  }

  async verifyNin(
    dto: VerifyNinDto,
    scope: RequestScope,
  ): Promise<VerifyNinResult> {
    const businessScope = getBusinessScope(scope);
    const adapter = await this.getActiveKycAdapter();

    return adapter.verifyNin({
      ...businessScope,
      nin: dto.nin.trim(),
    });
  }

  async bvnImageMatch(
    dto: BvnImageMatchDto,
    scope: RequestScope,
  ): Promise<BvnImageMatchResult> {
    const businessScope = getBusinessScope(scope);
    const adapter = await this.getActiveKycAdapter();

    return adapter.bvnImageMatch({
      ...businessScope,
      bvn: dto.bvn.trim(),
      base64Image: dto.base64Image,
    });
  }

  private async getActiveKycAdapter(): Promise<KycAdapter> {
    const provider = await this.providerService.getActiveProviderForService(
      ProviderServiceType.KYC,
    );

    return this.kycAdapterFactory.getKycAdapter(provider.value);
  }
}
