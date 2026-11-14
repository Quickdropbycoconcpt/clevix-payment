import { Injectable } from '@nestjs/common';
import {
  BvnImageMatchResult,
  KycAdapter,
  KycProvider,
  VerifyBvnResult,
  VerifyNinResult,
} from '../../adapters/kyc.adapter';
import { serviceConfigurationError } from 'src/shared/utils';

@Injectable()
export class FcmbKycProvider implements KycAdapter {
  readonly provider = KycProvider.FCMB;

  verifyBvn(): Promise<VerifyBvnResult> {
    throw serviceConfigurationError(
      'FCMB BVN verification is not wired up yet',
    );
  }

  verifyNin(): Promise<VerifyNinResult> {
    throw serviceConfigurationError(
      'FCMB NIN verification is not wired up yet',
    );
  }

  bvnImageMatch(): Promise<BvnImageMatchResult> {
    throw serviceConfigurationError('FCMB BVN image match is not wired up yet');
  }
}
