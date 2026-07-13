import { Injectable } from '@nestjs/common';
import {
  BvnImageMatchResult,
  KycProvider,
  VerifyBvnResult,
  VerifyNinResult,
} from 'src/infrastructure/kyc/adapters/kyc.adapter';
import { KycAdapterFactory } from 'src/infrastructure/kyc/adapters/kyc.adapter.factory';
import { RequestScope, getBusinessScope } from 'src/shared/business-scope';
import { BvnImageMatchDto } from '../dto/bvn-image-match.dto';
import { VerifyBvnDto } from '../dto/verify-bvn.dto';
import { VerifyNinDto } from '../dto/verify-nin.dto';

@Injectable()
export class KycService {
  constructor(private readonly kycAdapterFactory: KycAdapterFactory) {}

  async verifyBvn(
    dto: VerifyBvnDto,
    scope: RequestScope,
  ): Promise<VerifyBvnResult> {
    const businessScope = getBusinessScope(scope);
    const provider = KycProvider.VFD;
    const adapter = this.kycAdapterFactory.getKycAdapter(provider);

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
    const provider = KycProvider.VFD;
    const adapter = this.kycAdapterFactory.getKycAdapter(provider);

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
    const provider = KycProvider.VFD;
    const adapter = this.kycAdapterFactory.getKycAdapter(provider);

    return adapter.bvnImageMatch({
      ...businessScope,
      bvn: dto.bvn.trim(),
      base64Image: dto.base64Image,
    });
  }
}
