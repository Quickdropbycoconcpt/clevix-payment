import { Injectable, NotImplementedException } from '@nestjs/common';
import {
  BvnImageMatchInput,
  BvnImageMatchResult,
  KycAdapter,
  KycProvider,
  VerifyBvnInput,
  VerifyBvnResult,
  VerifyNinInput,
  VerifyNinResult,
} from '../../adapters/kyc.adapter';

@Injectable()
export class FcmbKycProvider implements KycAdapter {
  readonly provider = KycProvider.FCMB;

  verifyBvn(input: VerifyBvnInput): Promise<VerifyBvnResult> {
    throw new NotImplementedException(
      `FCMB BVN verification is not wired up yet (bvn=${input.bvn})`,
    );
  }

  verifyNin(input: VerifyNinInput): Promise<VerifyNinResult> {
    throw new NotImplementedException(
      `FCMB NIN verification is not wired up yet (nin=${input.nin})`,
    );
  }

  bvnImageMatch(input: BvnImageMatchInput): Promise<BvnImageMatchResult> {
    throw new NotImplementedException(
      `FCMB BVN image match is not wired up yet (bvn=${input.bvn})`,
    );
  }
}
