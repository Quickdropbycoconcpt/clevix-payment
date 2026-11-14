import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import {
  DojahBvnLookupResult,
  DojahFaceMatchInput,
  DojahFaceMatchResult,
  DojahNinLookupResult,
} from './interface/dojah.interface';
import { KycProvider } from '../../adapters/kyc.adapter';
import { ErrorCode } from 'src/shared/exceptions/error-codes';
import { providerError } from 'src/shared/utils';

@Injectable()
export class DojahApiClient {
  constructor(private readonly httpService: HttpService) {}

  async bvnLookup(bvn: string): Promise<DojahBvnLookupResult> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/api/v1/kyc/bvn`, {
          params: { bvn },
          headers: this.headers(),
        }),
      );

      const entity = response.data?.entity ?? {};

      return {
        bvn: entity.bvn ?? bvn,
        firstName: entity.first_name,
        lastName: entity.last_name,
        middleName: entity.middle_name || undefined,
        dateOfBirth: entity.date_of_birth,
        phoneNumber: entity.phone_number1 || undefined,
        raw: response.data,
      };
    } catch (error: unknown) {
      throw providerError(
        KycProvider.DOJAH,
        'bvnLookup',
        error,
        ErrorCode.KYC_VERIFICATION_FAILED,
      );
    }
  }

  async ninLookup(nin: string): Promise<DojahNinLookupResult> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/api/v1/kyc/nin`, {
          params: { nin },
          headers: this.headers(),
        }),
      );

      const entity = response.data?.entity ?? {};

      return {
        nin: entity.nin ?? nin,
        firstName: entity.first_name,
        lastName: entity.last_name,
        middleName: entity.middle_name || undefined,
        dateOfBirth: entity.date_of_birth,
        gender: entity.gender,
        phoneNumber: entity.phone_number1 || undefined,
        address: entity.residence_address || undefined,
      };
    } catch (error: unknown) {
      throw providerError(
        KycProvider.DOJAH,
        'ninLookup',
        error,
        ErrorCode.KYC_VERIFICATION_FAILED,
      );
    }
  }

  async identityWithFaceMatch(
    input: DojahFaceMatchInput,
  ): Promise<DojahFaceMatchResult> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.baseUrl}/api/v1/kyc/bvn/verify`,
          {
            bvn: input.bvn,
            selfie_image: input.selfieImageBase64,
          },
          { headers: this.headers() },
        ),
      );

      const entity = response.data?.entity ?? {};
      const selfieVerification = entity.selfie_verification ?? {};

      return {
        bvn: entity.bvn ?? input.bvn,
        firstName: entity.first_name,
        lastName: entity.last_name,
        middleName: entity.middle_name || undefined,
        dateOfBirth: entity.date_of_birth,
        phoneNumber: entity.phone_number1,
        gender: entity.gender,
        match: selfieVerification.match ?? false,
        confidence: selfieVerification.confidence_value,
      };
    } catch (error: unknown) {
      throw providerError(
        KycProvider.DOJAH,
        'identityWithFaceMatch',
        error,
        ErrorCode.KYC_VERIFICATION_FAILED,
      );
    }
  }

  private get baseUrl(): string {
    return process.env.DOJAH_BASE_URL ?? 'https://api.dojah.io';
  }

  private headers(): Record<string, string> {
    return {
      AppId: process.env.DOJAH_APP_ID ?? '',
      Authorization: process.env.DOJAH_SECRET_KEY ?? '',
    };
  }
}
