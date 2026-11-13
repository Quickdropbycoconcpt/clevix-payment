import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { RedisConfig } from 'src/infrastructure/redis/redis.config';
import { RequestEnvironment } from 'src/shared/enum';
import { base64Encoded } from 'src/shared/encryption';

type MonnifyResponse<T> = {
  requestSuccessful: boolean;
  responseMessage: string;
  responseCode: string;
  responseBody: T;
};

type MonnifyCredentials = {
  baseUrl: string;
  apiKey: string;
  secretKey: string;
  contractCode: string;
  walletAccountNumber: string;
};

export type MonnifyReservedAccount = {
  bankCode: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
};

export type MonnifyCardCharge = {
  status: string;
  message?: string;
  otpData?: { id: string; message?: string };
  secure3dData?: { redirectUrl?: string };
};

const REQUEST_TIMEOUT_MS = 25000;
const CARD_SESSION_TTL_SECONDS = 15 * 60;

@Injectable()
export class MonnifyClient {
  private readonly logger = new Logger(MonnifyClient.name);
  private readonly AUTH_CACHE_KEY = 'monnify_access_token';
  private readonly CARD_SESSION_KEY = 'monnify_card_session';
  private readonly redis = new RedisConfig();

  constructor(private readonly httpService: HttpService) {}

  async createReservedAccount(input: {
    environment: string;
    accountReference: string;
    accountName: string;
    customerName: string;
    customerEmail: string;
    bvn?: string;
    nin?: string;
  }): Promise<MonnifyReservedAccount> {
    const credentials = this.credentialPicker(input.environment);
    const body = await this.request<{ accounts: MonnifyReservedAccount[] }>(
      input.environment,
      'post',
      '/api/v2/bank-transfer/reserved-accounts',
      {
        accountReference: input.accountReference,
        accountName: input.accountName,
        currencyCode: 'NGN',
        contractCode: credentials.contractCode,
        customerEmail: input.customerEmail,
        customerName: input.customerName,
        bvn: input.bvn,
        nin: input.nin,
        getAllAvailableBanks: true,
      },
      'createReservedAccount',
    );

    const account = body.accounts?.[0];

    if (!account) {
      throw new BadRequestException('Monnify returned no reserved account');
    }

    return account;
  }

  async initTransaction(input: {
    environment: string;
    amountInNaira: number;
    paymentReference: string;
    customerName: string;
    customerEmail: string;
    description: string;
    paymentMethods: ('CARD' | 'ACCOUNT_TRANSFER')[];
  }): Promise<{ transactionReference: string }> {
    const credentials = this.credentialPicker(input.environment);

    return this.request(
      input.environment,
      'post',
      '/api/v1/merchant/transactions/init-transaction',
      {
        amount: input.amountInNaira,
        customerName: input.customerName,
        customerEmail: input.customerEmail,
        paymentReference: input.paymentReference,
        paymentDescription: input.description,
        currencyCode: 'NGN',
        contractCode: credentials.contractCode,
        paymentMethods: input.paymentMethods,
      },
      'initTransaction',
    );
  }

  async initBankTransferPayment(
    environment: string,
    transactionReference: string,
  ): Promise<{ accountNumber: string; accountName: string; bankName: string }> {
    return this.request(
      environment,
      'post',
      '/api/v1/merchant/bank-transfer/init-payment',
      { transactionReference },
      'initBankTransferPayment',
    );
  }

  async chargeCard(input: {
    environment: string;
    paymentReference: string;
    transactionReference: string;
    cardNumber: string;
    expiryMonth: string;
    expiryYear: string;
    pin: string;
    cvv: string;
  }): Promise<MonnifyCardCharge> {
    const charge = await this.request<MonnifyCardCharge>(
      input.environment,
      'post',
      '/api/v1/merchant/cards/charge',
      {
        transactionReference: input.transactionReference,
        collectionChannel: 'API_NOTIFICATION',
        card: {
          number: input.cardNumber,
          expiryMonth: input.expiryMonth,
          expiryYear: input.expiryYear,
          pin: input.pin,
          cvv: input.cvv,
        },
      },
      'chargeCard',
    );

    if (charge.otpData?.id) {
      await this.redis.storeData(
        `${this.CARD_SESSION_KEY}_${input.paymentReference}`,
        JSON.stringify({
          transactionReference: input.transactionReference,
          tokenId: charge.otpData.id,
        }),
        CARD_SESSION_TTL_SECONDS,
      );
    }

    return charge;
  }

  async authorizeCardOtp(input: {
    environment: string;
    paymentReference: string;
    otp: string;
  }): Promise<MonnifyCardCharge> {
    const sessionKey = `${this.CARD_SESSION_KEY}_${input.paymentReference}`;
    const session = await this.redis.retrieveData(sessionKey);

    if (!session) {
      throw new BadRequestException(
        'Card session not found or expired. Initiate the payment again',
      );
    }

    const { transactionReference, tokenId } = JSON.parse(session);

    const result = await this.request<MonnifyCardCharge>(
      input.environment,
      'post',
      '/api/v1/merchant/cards/otp/authorize',
      {
        transactionReference,
        collectionChannel: 'API_NOTIFICATION',
        tokenId,
        token: input.otp,
      },
      'authorizeCardOtp',
    );

    await this.redis.deleteData(sessionKey);

    return result;
  }

  async singleTransfer(input: {
    environment: string;
    amountInNaira: number;
    reference: string;
    narration: string;
    destinationBankCode: string;
    destinationAccountNumber: string;
    sourceAccountNumber?: string;
  }): Promise<{ status: string; reference: string }> {
    const credentials = this.credentialPicker(input.environment);

    return this.request(
      input.environment,
      'post',
      '/api/v2/disbursements/single',
      {
        amount: input.amountInNaira,
        reference: input.reference,
        narration: input.narration,
        destinationBankCode: input.destinationBankCode,
        destinationAccountNumber: input.destinationAccountNumber,
        currency: 'NGN',
        sourceAccountNumber:
          input.sourceAccountNumber ?? credentials.walletAccountNumber,
      },
      'singleTransfer',
    );
  }

  async transferStatus(
    environment: string,
    reference: string,
  ): Promise<{ status: string; sessionId?: string }> {
    return this.request(
      environment,
      'get',
      `/api/v2/disbursements/single/summary?reference=${encodeURIComponent(reference)}`,
      undefined,
      'transferStatus',
    );
  }

  async walletBalance(
    environment: string,
    accountNumber: string,
  ): Promise<{ availableBalance: number; ledgerBalance: number }> {
    return this.request(
      environment,
      'get',
      `/api/v2/disbursements/wallet-balance?accountNumber=${encodeURIComponent(accountNumber)}`,
      undefined,
      'walletBalance',
    );
  }

  async bankList(): Promise<{ name: string; code: string }[]> {
    return this.request(
      RequestEnvironment.LIVE,
      'get',
      '/api/v1/banks',
      undefined,
      'bankList',
    );
  }

  async validateAccount(
    environment: string,
    accountNumber: string,
    bankCode: string,
  ): Promise<{ accountNumber: string; accountName: string; bankCode: string }> {
    return this.request(
      environment,
      'get',
      `/api/v2/disbursements/account/validate?accountNumber=${encodeURIComponent(
        accountNumber,
      )}&bankCode=${encodeURIComponent(bankCode)}`,
      undefined,
      'validateAccount',
    );
  }

  private async request<T>(
    environment: string,
    method: 'get' | 'post',
    path: string,
    payload: unknown,
    operation: string,
  ): Promise<T> {
    const { baseUrl } = this.credentialPicker(environment);

    try {
      const response = await this.withTokenRetry(environment, (token) => {
        const config = {
          headers: { Authorization: `Bearer ${token}` },
          timeout: REQUEST_TIMEOUT_MS,
        };

        return firstValueFrom(
          method === 'get'
            ? this.httpService.get<MonnifyResponse<T>>(
                `${baseUrl}${path}`,
                config,
              )
            : this.httpService.post<MonnifyResponse<T>>(
                `${baseUrl}${path}`,
                payload,
                config,
              ),
        );
      });

      if (!response.data?.requestSuccessful) {
        this.logProviderError(operation, {
          response: { status: response.status, data: response.data },
        });
        throw new BadRequestException(
          response.data?.responseMessage ?? `Monnify ${operation} failed`,
        );
      }

      return response.data.responseBody;
    } catch (error: any) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      this.logProviderError(operation, error);
      throw new BadRequestException(
        error?.response?.data?.responseMessage ?? `Monnify ${operation} failed`,
      );
    }
  }

  private async withTokenRetry<T>(
    environment: string,
    fn: (token: string) => Promise<T>,
  ): Promise<T> {
    const token = await this.getToken(environment);

    try {
      return await fn(token);
    } catch (error: any) {
      if (error?.response?.status === 401) {
        await this.redis.deleteData(`${this.AUTH_CACHE_KEY}_${environment}`);
        return fn(await this.login(environment));
      }
      throw error;
    }
  }

  private async getToken(environment: string): Promise<string> {
    const cachedToken = await this.redis.retrieveData(
      `${this.AUTH_CACHE_KEY}_${environment}`,
    );

    return cachedToken ?? this.login(environment);
  }

  private async login(environment: string): Promise<string> {
    const { baseUrl, apiKey, secretKey } = this.credentialPicker(environment);

    try {
      const response = await firstValueFrom(
        this.httpService.post<
          MonnifyResponse<{ accessToken: string; expiresIn: number }>
        >(
          `${baseUrl}/api/v1/auth/login`,
          {},
          {
            headers: {
              Authorization: `Basic ${base64Encoded(`${apiKey}:${secretKey}`)}`,
            },
            timeout: REQUEST_TIMEOUT_MS,
          },
        ),
      );

      const { accessToken, expiresIn } = response.data.responseBody;

      await this.redis.storeData(
        `${this.AUTH_CACHE_KEY}_${environment}`,
        accessToken,
        Math.max(expiresIn - 60, 60),
      );

      return accessToken;
    } catch (error: any) {
      this.logProviderError('login', error);
      throw new BadRequestException('Unable to authenticate with Monnify');
    }
  }

  private credentialPicker(environment: string): MonnifyCredentials {
    const isTest = environment === RequestEnvironment.TEST;

    return {
      baseUrl: isTest
        ? (process.env.MONNIFY_DEV_BASE_URL ?? 'https://sandbox.monnify.com')
        : (process.env.MONNIFY_LIVE_BASE_URL ?? 'https://api.monnify.com'),
      apiKey: isTest
        ? process.env.MONNIFY_DEV_API_KEY
        : process.env.MONNIFY_LIVE_API_KEY,
      secretKey: isTest
        ? process.env.MONNIFY_DEV_SECRET_KEY
        : process.env.MONNIFY_LIVE_SECRET_KEY,
      contractCode: isTest
        ? process.env.MONNIFY_DEV_CONTRACT_CODE
        : process.env.MONNIFY_LIVE_CONTRACT_CODE,
      walletAccountNumber: isTest
        ? process.env.MONNIFY_DEV_WALLET_ACCOUNT_NUMBER
        : process.env.MONNIFY_LIVE_WALLET_ACCOUNT_NUMBER,
    };
  }

  private logProviderError(operation: string, error: any) {
    this.logger.error(
      `Monnify ${operation} failed status=${error?.response?.status ?? 'none'} response=${JSON.stringify(
        error?.response?.data ?? { message: error?.message },
      )}`,
    );
  }
}
