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
import { DojahApiClient } from './dojah-api-client';

@Injectable()
export class DojahKycProvider implements KycAdapter {
  readonly provider = KycProvider.DOJAH;

  constructor(private readonly dojahClient: DojahApiClient) {}

  async verifyBvn(input: VerifyBvnInput): Promise<VerifyBvnResult> {
    const result = await this.dojahClient.bvnLookup(input.bvn);

    return {
      bvn: result.bvn,
      firstName: result.firstName,
      lastName: result.lastName,
      middleName: result.middleName,
      dateOfBirth: result.dateOfBirth,
      phoneNumber: result.phoneNumber,
      raw: result.raw,
    };
  }

  async verifyNin(input: VerifyNinInput): Promise<VerifyNinResult> {
    const result = await this.dojahClient.ninLookup(input.nin);

    return {
      nin: result.nin,
      firstName: result.firstName,
      lastName: result.lastName,
      middleName: result.middleName,
      dateOfBirth: result.dateOfBirth,
      phoneNumber: result.phoneNumber,
      address: result.address ?? '',
      raw: result.raw,
    };
  }

  async bvnImageMatch(
    input: BvnImageMatchInput,
  ): Promise<BvnImageMatchResult> {
    const result = await this.dojahClient.identityWithFaceMatch({
      bvn: input.bvn,
      selfieImageBase64: input.base64Image,
    });

    return {
      bvn: result.bvn,
      match: result.match,
      confidence: result.confidence,
    };
  }
}
