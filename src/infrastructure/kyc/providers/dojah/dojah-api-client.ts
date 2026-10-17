import { BadRequestException, Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import {
  DojahBvnLookupResult,
  DojahFaceMatchInput,
  DojahFaceMatchResult,
  DojahNinLookupResult,
} from './interface/dojah.interface';

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
    } catch (error: any) {
      throw new BadRequestException(
        error?.response?.data?.error ?? error.message,
        error,
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
        firstName: entity.firstname,
        lastName: entity.surname,
        middleName: entity.middlename || undefined,
        dateOfBirth: entity.birthdate,
        phoneNumber: entity.telephoneno || undefined,
        address: entity.residence_address || undefined,
        raw: response.data,
      };
    } catch (error: any) {
      throw new BadRequestException(
        error?.response?.data?.error ?? error.message,
        error,
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
        match: selfieVerification.match ?? false,
        confidence: selfieVerification.confidence_value,
        raw: response.data,
      };
    } catch (error: any) {
      throw new BadRequestException(
        error?.response?.data?.error ?? error.message,
        error,
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
