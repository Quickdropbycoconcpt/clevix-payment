import { BadRequestException, Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import {
  ChargePosInput,
  ChargePosResult,
} from 'src/modules/Api/collection/adapters/contracts/pos.adapter';
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
import * as crypto from 'node:crypto';
import { TransferQueJobData } from 'src/modules/Api/transfers/job/transfer-queue-job';
import {
  AccountValidation,
  TransactionQueryStatus,
  TransactionStatusQuery,
} from 'src/modules/Api/transfers/types/transfer-provider';
import {
  base64Encoded,
  tripleDESEncrypt,
  tripleDESDecrypt,
  buildPosDataCode,
} from 'src/shared/encryption';

type VfdCreateVirtualAccountResponse = {
  accountNumber: string;
  reference: string;
  accountName: string;
  bankName: string;
};

@Injectable()
export class VfdClient {
  constructor(private readonly httpService: HttpService) {}
  private readonly serviceName = VfdClient.name;
  private readonly AUTH_CACHE_KEY = 'vfd_access_token';
  private readonly redis = new RedisConfig();

  async bvnLookup(input: { bvn: string; environment: string }): Promise<{
    firstName?: string;
    lastName?: string;
    middleName?: string;
    dateOfBirth?: string;
    phoneNumber?: string;
    raw: unknown;
  }> {
    try {
      const credentials = this.credentialPicker(input.environment);
      const response = await this.withTokenRetry(input.environment, (token) =>
        firstValueFrom(
          this.httpService.get(
            `${credentials.kycUrl}/client/bvn?bvn=${input.bvn}`,
            axiosConfig(input.environment, token),
          ),
        ),
      );

      return {
        firstName: response.data?.data?.firstname,
        lastName: response.data?.data?.lastname,
        middleName: response.data?.data?.middlename,
        dateOfBirth: response.data?.data?.dateOfBirth,
        phoneNumber: response.data?.data?.phoneNumber,
        raw: response.data,
      };
    } catch (error: any) {
      console.log(error);
      throw new BadRequestException(
        error?.response?.data?.message ?? error.message,
        error,
      );
    }
  }

  async ninLookup(input: { nin: string; environment: string }): Promise<{
    firstName?: string;
    lastName?: string;
    middleName?: string;
    address: string;
    dateOfBirth?: string;
    phoneNumber?: string;
    raw: unknown;
  }> {
    try {
      const credentials = this.credentialPicker(input.environment);
      const response = await this.withTokenRetry(input.environment, (token) =>
        firstValueFrom(
          this.httpService.post(
            `${credentials.kycUrl}/verify/nin`,
            { idNumber: input.nin },
            axiosConfig(input.environment, token),
          ),
        ),
      );

      return {
        firstName: response.data?.data?.firstName,
        lastName: response.data?.data?.lastName,
        middleName: response.data?.data?.middleName,
        address: response.data?.data?.address,
        dateOfBirth: response.data?.data?.dateOfBirth,
        phoneNumber: response.data?.data?.phoneNumber,
        raw: response.data,
      };
    } catch (error: any) {
      console.log(error);
      throw new BadRequestException(
        error?.response?.data?.message ?? error.message,
        error,
      );
    }
  }

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
            `${credentials.walletUrl}/credit`,

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

  async chargePos(input: ChargePosInput): Promise<ChargePosResult> {
    try {
      const {
        pan,
        pin,
        currency,
        accountType,
        amount,
        cardExpiryDate,
        source,
        sequenceNumber,
        serialNumber,
        rrn,
        stan,
        iccData,
        track2Data,
      } = input;
      const credentials = this.credentialPicker(input.environment);
      const username = credentials.pos_auth_username;
      const password = credentials.pos_auth_password;
      const encodedbase64 = base64Encoded(`${username}:${password}`);
      const response = await firstValueFrom(
        this.httpService.post(
          `${credentials.lux_url}/resd/network-mgt`,

          {
            serialNumber,
            stan: input.stan,
            onlyAccountInfo: false,
          },
          {
            headers: {
              Authorization: `Basic ${encodedbase64}`,
            },
          },
        ),
      );
      const { sessionId, terminalId, businessName, businessAddress } =
        response.data.data;
      const payload = {
        pan,
        stan,
        rrn,
        amount,
        iccData,
        track2Data,
        postDataCode: buildPosDataCode(source),
        cardExpiryDate,
        acquiringInstitutionalCode: '53998359',
        sequenceNumber,
        pin,
        accountType,
        type: 'CARD',
        transactionCurrency: 'NAIRA',
        businessName,
        businessAddress,
        latitude: null,
        longitude: null,
      };

      const encrypted = tripleDESEncrypt(JSON.stringify(payload), sessionId);
      const cardCharge = await firstValueFrom(
        this.httpService.post(
          `${credentials.lux_url}/resd/transaction`,
          encrypted,
          {
            headers: {
              Authorization: `Basic ${encodedbase64}`,
              terminalId,
              sessionId,
              'Content-Type': 'text/plain',
              Accept: 'application/json',
            },
          },
        ),
      );
      const decryptedResponse = tripleDESDecrypt(
        cardCharge.data.data,
        sessionId,
      );
      const dv = JSON.parse(decryptedResponse);
      return {
        code: dv?.responseCode,
        status: dv?.description,
        amount: dv?.amount,
        currency,
      };
    } catch (error: any) {
      throw new BadRequestException(error.message);
    }
  }

  private credentialPicker(environment: string): {
    walletUrl: string;
    authUrl: string;
    consumerKey: string;
    lux_url: string;
    kycUrl: string;
    consumerSecret: string;
    pos_auth_username: string;
    pos_auth_password: string;
  } {
    const url =
      environment == RequestEnvironment.TEST
        ? process.env.VFD_DEV_WALLET_URL
        : process.env.VFD_LIVE_WALLET_URL;

    const lux_url =
      environment == RequestEnvironment.TEST
        ? process.env.VFD_LUX_DEV_BASE_URL
        : process.env.VFD_LUX_LIVE_BASE_URL;

    const kycUrl =
      environment == RequestEnvironment.TEST
        ? process.env.VFD_DEV_KYC_URL
        : process.env.VFD_LIVE_KYC_URL;

    const pos_auth_username =
      environment == RequestEnvironment.TEST
        ? process.env.VFD_LUX_DEV_USERNAME
        : process.env.VFD_LUX_LIVE_USERNAME;

    const pos_auth_password =
      environment == RequestEnvironment.TEST
        ? process.env.VFD_LUX_DEV_PASSWORD
        : process.env.VFD_LUX_LIVE_PASSWORD;

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

    return {
      walletUrl: url,
      consumerKey,
      consumerSecret,
      authUrl,
      lux_url,
      kycUrl,
      pos_auth_password,
      pos_auth_username,
    };
  }

  private async vfdVirtualAccountGeneration(body: CreateVirtualAccountInput) {
    try {
      const totalAmount = MoneyValueConverter.fromKoboToNaira(body.amount);
      const credentials = this.credentialPicker(body.environment);

      const response = await this.withTokenRetry(body.environment, (token) =>
        firstValueFrom(
          this.httpService.post(
            `${credentials.walletUrl}/virtualaccount`,
            {
              amount: totalAmount.toString(),
              merchantName: body.accountName ?? 'CLEVIX CHECKOUT',
              merchantId: body.businessId,
              reference: body.reference,
              validityTime: `${body.validityTime ?? '2400'}`,
              amountValidation: body.amountValidation ?? 'A0',
            },
            axiosConfig(body.environment, token),
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
            `${credentials.walletUrl}/client/tiers/individual?${queryParams.toString()}`,
            {},
            axiosConfig(body.environment, token),
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
            `${credentials.walletUrl}/client/tiers/corporate`,
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
  async withTokenRetry<T>(
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

  async vfdTransfer(body: TransferQueJobData) {
    const response = await this.vfdsenderaccountEnquiry(
      body.environment,
      body.senderAccount,
    );
    const query: AccountValidation = {
      accountNumber: body.accountNumber,
      bankCode: body.bankCode,
    };
    const recieverDetails = await this.vfdAccountValidation(
      body.environment,
      query,
    );
    const { accountNo, client, clientId, accountId } = response;
    const accountConcat = `${accountNo}${body.accountNumber}`;
    const signature = crypto
      .createHash('sha512')
      .update(accountConcat)
      .digest('hex');
    const payload = {
      fromAccount: accountNo,
      fromClientId: clientId,
      fromClient: client,
      fromSavingsId: accountId,
      fromBvn: '',
      toClientId: recieverDetails.data.clientId,
      toClient: body.accountName,
      toSavingsId: recieverDetails.data.account.id,
      toSession: recieverDetails.data.account.id,
      toBvn: recieverDetails.data.bvn,
      toAccount: body.accountNumber,
      toBank: body.bankCode,
      signature,
      amount: MoneyValueConverter.fromKoboToNaira(body.amount),
      remark: body.narration,
      transferType: body.bankCode == '999999' ? 'intra' : 'inter',
      reference: body.reference,
    };
    try {
      const credentials = this.credentialPicker(body.environment);
      const response = await this.withTokenRetry(body.environment, (token) =>
        firstValueFrom(
          this.httpService.post(
            `${credentials.walletUrl}/transfer`,
            payload,
            axiosConfig(body.environment, token),
          ),
        ),
      );
      return response.data;
    } catch (error: any) {
      console.log(error);
      throw new BadRequestException(error.message);
    }
  }

  async vfdsenderaccountEnquiry(
    environment: string,
    senderAccountNo: string,
  ): Promise<{
    clientId: string;
    accountId: string;
    client: string;
    accountNo: string;
  }> {
    try {
      const credentials = this.credentialPicker(environment);
      const queryParams = new URLSearchParams();
      if (senderAccountNo) queryParams.append('accountNumber', senderAccountNo);
      const response = await this.withTokenRetry(environment, (token) =>
        firstValueFrom(
          this.httpService.get(
            `${credentials.walletUrl}/account/enquiry?${queryParams.toString()}`,
            axiosConfig(environment, token),
          ),
        ),
      );
      const { accountNo, client, clientId, accountId } = response.data.data;
      return { clientId, client, accountNo, accountId };
    } catch (error) {
      console.log(error);
    }
  }

  async vfdAccountValidation(environment: string, query: AccountValidation) {
    try {
      const credentials = this.credentialPicker(environment);
      const response = await this.withTokenRetry(environment, (token) =>
        firstValueFrom(
          this.httpService.get(
            `${credentials.walletUrl}/transfer/recipient?accountNo=${
              query.accountNumber
            }&bank=${query.bankCode}&transfer_type=${
              query.bankCode == '999999' ? 'intra' : 'inter'
            }`,

            axiosConfig(environment, token),
          ),
        ),
      );
      return response.data;
    } catch (error: any) {
      if (error.response) {
        if (error.response.status == 404) {
          throw new BadRequestException('Receipient details not found');
        }
      }
      throw new BadRequestException(error.message, error);
    }
  }

  async transactionStatusQuery(
    input: TransactionStatusQuery,
  ): Promise<TransactionQueryStatus> {
    try {
      const { reference, environment } = input;
      const credentials = this.credentialPicker(environment);
      const response = await this.withTokenRetry(environment, (token) =>
        firstValueFrom(
          this.httpService.get(
            `${credentials.walletUrl}/transactions?reference=${reference}`,

            axiosConfig(environment, token),
          ),
        ),
      );
      console.log('txnStatus', response);
      if (!response?.data?.data?.transactionStatus) {
        return {
          success: false,
          sessionId: response?.data?.data?.sessionId,
          reference,
        };
      }
      return response.data.data.transactionStatus == '00'
        ? { success: true, sessionId: response.data.data.sessionId, reference }
        : {
            success: false,
            sessionId: response?.data?.data?.sessionId,
            reference,
          };
    } catch (error) {
      console.log(error);
      return { success: false, sessionId: null, reference: input.reference };
    }
  }

  async bvnImageMatch(input: {
    bvn: string;
    base64Image: string;
    environment: string;
  }): Promise<{
    match: boolean;
    confidence?: number;
    raw: unknown;
    bvn: string;
  }> {
    try {
      const credentials = this.credentialPicker(input.environment);
      const response = await this.withTokenRetry(input.environment, (token) =>
        firstValueFrom(
          this.httpService.post(
            `${credentials.kycUrl}/image/match`,
            {
              bvn: input.bvn,
              base64Image: input.base64Image,
            },
            axiosConfig(input.environment, token),
          ),
        ),
      );

      return {
        match: response.data?.data?.isMatch ?? false,
        confidence: response.data?.data?.similarityScore,
        bvn: response.data?.data?.bvn,
        raw: response.data,
      };
    } catch (error: any) {
      console.log(error);
      throw new BadRequestException(
        error?.response?.data?.message ?? error.message,
        error,
      );
    }
  }
}
