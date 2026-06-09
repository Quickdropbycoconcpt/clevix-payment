import { BadRequestException, Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ChargePosInput } from 'src/modules/Api/collection/adapters/contracts/pos.adapter';
import {
  CreateCorporateStaticAccount,
  CreateIndividualStaticAccount,
  CreateVirtualAccountInput,
  SimulateInwardCreditInput,
} from 'src/modules/Api/collection/adapters/contracts/virtual-account.adapter';
import { RedisConfig } from 'src/infrastructure/redis/redis.config';
import { RequestEnvironment } from 'src/shared/enum';
import { MoneyValueConverter } from 'src/shared/converter';
import { axiosConfig } from 'src/shared/utils';

type VfdCreateVirtualAccountResponse = {
  accountNumber: string;
  reference: string;
  accountName: string;
  bankName: string;
};

type VfdChargePosResponse = {
  reference: string;
  terminal_id: string;
  amount: number;
  currency: string;
  status: string;
};

@Injectable()
export class VfdClient {
  constructor(private readonly httpService: HttpService) {}
  private readonly serviceName = VfdClient.name;
  private readonly AUTH_CACHE_KEY = 'vfd_access_token';
  private readonly redis = new RedisConfig();
  async createVirtualAccount(
    input: CreateVirtualAccountInput,
  ): Promise<VfdCreateVirtualAccountResponse> {
    const response = await this.vfdVirtualAccountGeneration(input);
    console.log(response);
    return {
      accountNumber: response.data?.accountNumber,
      accountName: input.accountName,
      reference: input.reference,
      bankName: 'VFD MFB',
    };
  }

  async createIndividualStaticAccount(input: CreateIndividualStaticAccount) {
    const response = await this.individualStaticAccountCreation(input);
    return {
      accountNumber: response.accountNumber,
      firstName: response.firstName,
      lastName: response.lastName,
      currentTier: response.currentTier,
      middleName: response.middleName,
      bankName: 'VFD MFB',
    };
  }

  async createBusinessStaticAccount(input: CreateCorporateStaticAccount) {
    const response = await this.BusinessStaticAccountCreation(input);
    return {
      accountNumber: response.accountNumber,
      accountName: response.accountName,
      bankName: 'VFD MFB',
    };
  }

  async simulateInWardVirtualCredit(body: SimulateInwardCreditInput) {
    try {
      const totalAmount = body.amount;
      const credentials = this.credentialPicker(body.environment);

      const response = await this.withTokenRetry(body.environment, (token) =>
        firstValueFrom(
          this.httpService.post(
            `${credentials.url}/credit`,

            {
              amount: totalAmount.toString(),
              accountNo: body.accountNumber,
              senderAccountNo: '5050104057',
              senderBank: '999070',
              senderNarration: body.narration ?? `Payment for pizza`,
            },
            axiosConfig(body.environment, token),
          ),
        ),
      );
      return response;
    } catch (error: any) {
      console.log(error);
      throw new BadRequestException('Invalid request.', error);
    }
  }

  async chargePos(input: ChargePosInput): Promise<VfdChargePosResponse> {
    return {
      reference: `vfd_pos_${input.reference}`,
      terminal_id: input.terminalId,
      amount: input.amount,
      currency: input.currency,
      status: 'pending',
    };
  }

  private credentialPicker(environment: string): {
    url: string;
    authUrl: string;
    consumerKey: string;
    consumerSecret: string;
  } {
    const url =
      environment == RequestEnvironment.TEST
        ? process.env.VFD_DEV_WALLET_URL
        : process.env.VFD_LIVE_WALLET_URL;

    const authUrl =
      environment == RequestEnvironment.TEST
        ? process.env.VFD_DEV_AUTH_URL
        : process.env.VFD_LIVE_AUTH_URL;

    const consumerKey =
      environment == RequestEnvironment.TEST
        ? process.env.VFD_DEV_CONSUMER_KEY
        : process.env.VFD_LIVE_CONSUMER_KEY;

    const consumerSecret =
      environment == RequestEnvironment.TEST
        ? process.env.VFD_DEV_CONSUMER_SECRET
        : process.env.VFD_LIVE_CONSUMER_SECRET;

    return { url, consumerKey, consumerSecret, authUrl };
  }

  private async vfdVirtualAccountGeneration(body: CreateVirtualAccountInput) {
    try {
      const totalAmount = MoneyValueConverter.fromKoboToNaira(body.amount);
      const credentials = this.credentialPicker(body.environment);

      const response = await this.withTokenRetry(body.environment, (token) =>
        firstValueFrom(
          this.httpService.post(
            `${credentials.url}/virtualaccount`,
            {
              amount: totalAmount.toString(),
              merchantName: body.accountName ?? 'CLEVIX CHECKOUT',
              merchantId: body.businessId,
              reference: body.reference,
              validityTime: `${body.validityTime ?? '2400'}`,
              amountValidation: body.amountValidation ?? 'A0',
            },
            { headers: { AccessToken: token } },
          ),
        ),
      );
      return response;
    } catch (error) {
      console.log(error);
      throw new BadRequestException(
        'Unable to generate payment account',
        error,
      );
    }
  }

  private async individualStaticAccountCreation(
    body: CreateIndividualStaticAccount,
  ) {
    try {
      const queryParams = new URLSearchParams();
      const credentials = this.credentialPicker(body.environment);
      const { bvn, address, dob, nin } = body;
      if (bvn) queryParams.append('bvn', bvn);
      if (dob) queryParams.append('dateOfBirth', dob);
      if (nin) queryParams.append('nin', nin);
      if (address) queryParams.append('address', address);
      const response = await this.withTokenRetry(body.environment, (token) =>
        firstValueFrom(
          this.httpService.post(
            `${credentials.url}/client/tiers/individual?${queryParams.toString()}`,
            {},
            { headers: { AccessToken: token } },
          ),
        ),
      );
      if (response.data.status != '00') {
        throw new BadRequestException(response.data.message);
      }
      return {
        firstName: response.data.data.firstname,
        lastName: response.data.data.lastname,
        middleName: response.data.data.middlename,
        currentTier: response.data.data.currentTier,
        accountNumber: response.data.data.accountNo,
      };
    } catch (error: any) {
      console.log(error);
      throw new BadRequestException(error.response.data.message, error);
    }
  }

  private async BusinessStaticAccountCreation(
    body: CreateCorporateStaticAccount,
  ) {
    try {
      const credentials = this.credentialPicker(body.environment);
      const {
        bvn,
        address,
        businessType,
        nin,
        state,
        rcNumber,
        companyName,
        incorporationDate,
      } = body;
      const response = await this.withTokenRetry(body.environment, (token) =>
        firstValueFrom(
          this.httpService.post(
            `${credentials.url}/client/tiers/corporate`,
            {
              rcNumber,
              companyName,
              incorporationDate: incorporationDate,
              bvn,
              tin: '',
              nin,
              address,
              businessType,
              state,
            },
            { headers: { AccessToken: token } },
          ),
        ),
      );
      console.log(response);
      if (response.data.status != '00') {
        throw new BadRequestException(response.data.message);
      }
      return {
        accountName: response.data.data.accountName,
        accountNumber: response.data.data.accountNo,
      };
    } catch (error: any) {
      console.log(error);
      throw new BadRequestException(error.response.data.message, error);
    }
  }

  // Executes fn with a fresh token. If VFD returns 401, clears the cached
  // token and retries once with a newly authenticated token.
  protected async withTokenRetry<T>(
    environment: string,
    fn: (token: string) => Promise<T>,
  ): Promise<T> {
    const token = await this.getTokenFromCache(environment);
    try {
      return await fn(token);
    } catch (error: any) {
      if (error?.response?.status === 401 || error?.response?.status == 403) {
        await this.redis.deleteData(`${this.AUTH_CACHE_KEY}_${environment}`);
        const freshToken = await this.vfdAuth(environment);

        return fn(freshToken);
      }
      throw error;
    }
  }

  private readonly getTokenFromCache = async (
    environment: string,
  ): Promise<string> => {
    const cachedToken = await this.redis.retrieveData(
      `${this.AUTH_CACHE_KEY}_${environment}`,
    );
    if (!cachedToken) {
      return this.vfdAuth(environment);
    }
    return cachedToken;
  };

  private async vfdAuth(environment: string) {
    try {
      const credentials = this.credentialPicker(environment);
      const { authUrl, consumerKey, consumerSecret } = credentials;
      const response = await firstValueFrom(
        this.httpService.post(
          `${authUrl}/baasauth/token`,
          {
            consumerSecret,
            consumerKey,
            validityTime: '-1',
          },
          axiosConfig(environment, ''),
        ),
      );

      if (response) {
        this.redis.storeData(
          `${this.AUTH_CACHE_KEY}_${environment}`,
          response?.data?.data?.access_token,
          3500,
        );
        return response?.data?.data?.access_token as string;
      }
    } catch (error: any) {
      console.log(error.message);
      throw new BadRequestException(error.message);
    }
  }
}
