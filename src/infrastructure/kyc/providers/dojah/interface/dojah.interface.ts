export type DojahBvnLookupResult = {
  bvn: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  dateOfBirth: string;
  phoneNumber?: string;
  raw: unknown;
};

export type DojahNinLookupResult = {
  nin: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  dateOfBirth: string;
  phoneNumber?: string;
  address?: string;
  raw: unknown;
};

export type DojahFaceMatchInput = {
  bvn: string;
  selfieImageBase64: string;
};

export type DojahFaceMatchResult = {
  bvn: string;
  match: boolean;
  confidence?: number;
  raw: unknown;
};
