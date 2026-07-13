export enum KycProvider {
  VFD = 'vfd',
  DOJAH = 'dojah',
  FCMB = 'fcmb',
}

export type VerifyBvnInput = {
  bvn: string;
  businessId: string;
  environment: string;
};

export type VerifyBvnResult = {
  bvn: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  dateOfBirth: string;
  phoneNumber?: string;
  raw?: unknown;
};

export type VerifyNinInput = {
  nin: string;
  businessId: string;
  environment: string;
};

export type VerifyNinResult = {
  nin: string;
  firstName: string;
  address: string;
  lastName: string;
  middleName?: string;
  dateOfBirth: string;
  phoneNumber?: string;
  raw?: unknown;
};

export type BvnImageMatchInput = {
  bvn: string;
  base64Image: string;
  businessId: string;
  environment: string;
};

export type BvnImageMatchResult = {
  bvn: string;
  match: boolean;
  confidence?: number;
};

export interface KycAdapter {
  readonly provider: KycProvider;

  verifyBvn(input: VerifyBvnInput): Promise<VerifyBvnResult>;

  verifyNin(input: VerifyNinInput): Promise<VerifyNinResult>;

  bvnImageMatch(input: BvnImageMatchInput): Promise<BvnImageMatchResult>;
}
