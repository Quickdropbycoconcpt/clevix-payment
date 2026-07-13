import { Injectable } from '@nestjs/common';
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
import { VfdClient } from 'src/infrastructure/payments/providers/vfd/vfd.client';

@Injectable()
export class VfdKycProvider implements KycAdapter {
  readonly provider = KycProvider.VFD;
  constructor(private readonly vfdClient: VfdClient) {}

  async verifyBvn(input: VerifyBvnInput): Promise<VerifyBvnResult> {
    const result = await this.vfdClient.bvnLookup({
      bvn: input.bvn,
      environment: input.environment,
    });

    return {
      bvn: input.bvn,
      firstName: result.firstName ?? '',
      lastName: result.lastName ?? '',
      middleName: result.middleName,
      dateOfBirth: result.dateOfBirth ?? '',
      phoneNumber: result.phoneNumber,
      raw: result.raw,
    };
  }

  async verifyNin(input: VerifyNinInput): Promise<VerifyNinResult> {
    const result = await this.vfdClient.ninLookup({
      nin: input.nin,
      environment: input.environment,
    });

    return {
      nin: input.nin,
      firstName: result.firstName ?? '',
      lastName: result.lastName ?? '',
      middleName: result.middleName,
      address: result.address,
      dateOfBirth: result.dateOfBirth ?? '',
      phoneNumber: result.phoneNumber,
    };
  }

  async bvnImageMatch(input: BvnImageMatchInput): Promise<BvnImageMatchResult> {
    const result = await this.vfdClient.bvnImageMatch({
      bvn: input.bvn,
      base64Image: input.base64Image,
      environment: input.environment,
    });

    return {
      bvn: input.bvn,
      match: result.match,
      confidence: result.confidence,
    };
  }
}
