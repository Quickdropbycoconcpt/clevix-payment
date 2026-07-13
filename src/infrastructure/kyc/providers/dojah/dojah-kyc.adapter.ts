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
export class DojahKycProvider implements KycAdapter {
  readonly provider = KycProvider.DOJAH;

  verifyBvn(input: VerifyBvnInput): Promise<VerifyBvnResult> {
    throw new NotImplementedException(
      `Dojah BVN verification is not wired up yet (bvn=${input.bvn})`,
    );
  }

  verifyNin(input: VerifyNinInput): Promise<VerifyNinResult> {
    throw new NotImplementedException(
      `Dojah NIN verification is not wired up yet (nin=${input.nin})`,
    );
  }

  bvnImageMatch(input: BvnImageMatchInput): Promise<BvnImageMatchResult> {
    throw new NotImplementedException(
      `Dojah BVN image match is not wired up yet (bvn=${input.bvn})`,
    );
  }
}
