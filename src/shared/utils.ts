import { BadRequestException } from '@nestjs/common';
import { MoneyValueConverter } from './converter';
import { AxiosRequestConfig } from 'axios';
import { RequestEnvironment } from './enum';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { randomInt } from 'crypto';

export type IntegerAmount = string | number | bigint;
export type DecimalValue = string | number;

export type DecimalRatio = {
  numerator: bigint;
  denominator: bigint;
};
const proxyUrl = process.env.QUOTAGUARDSTATIC_URL ?? 'https://example.com';

const httpsAgent = new HttpsProxyAgent(proxyUrl);
export const toIntegerAmountString = (
  amount: IntegerAmount,
  fieldName: string,
  options: { allowNegative?: boolean } = {},
): string => {
  const allowNegative = options.allowNegative ?? false;

  if (typeof amount === 'bigint') {
    if (!allowNegative && amount < 0n) {
      throw new BadRequestException(`${fieldName} cannot be negative`);
    }

    return amount.toString();
  }

  if (typeof amount === 'number') {
    if (!Number.isSafeInteger(amount)) {
      throw new BadRequestException(`${fieldName} must be a safe integer`);
    }

    if (!allowNegative && amount < 0) {
      throw new BadRequestException(`${fieldName} cannot be negative`);
    }

    return amount.toString();
  }

  const trimmedAmount = amount.trim();
  const pattern = allowNegative ? /^-?\d+$/ : /^\d+$/;

  if (!pattern.test(trimmedAmount)) {
    throw new BadRequestException(`${fieldName} must be an integer string`);
  }

  return trimmedAmount;
};

export const toIntegerAmountBigInt = (
  amount: IntegerAmount,
  fieldName: string,
  options: { allowNegative?: boolean } = {},
): bigint => BigInt(toIntegerAmountString(amount, fieldName, options));

export const toDecimalRatio = (
  value: DecimalValue,
  fieldName: string,
): DecimalRatio => {
  const rawValue = typeof value === 'number' ? value.toString() : value.trim();

  if (!/^-?\d+(\.\d+)?$/.test(rawValue)) {
    throw new BadRequestException(`${fieldName} must be a valid number`);
  }

  const isNegative = rawValue.startsWith('-');
  const unsignedValue = isNegative ? rawValue.slice(1) : rawValue;
  const [whole, decimal = ''] = unsignedValue.split('.');
  const denominator = 10n ** BigInt(decimal.length);
  const numerator = BigInt(`${whole}${decimal}`) * (isNegative ? -1n : 1n);

  return { numerator, denominator };
};

export const toRateRatio = (
  rate: DecimalValue,
  fieldName: string,
): DecimalRatio => {
  const ratio = toDecimalRatio(rate, fieldName);

  if (ratio.numerator < 0n) {
    throw new BadRequestException(`${fieldName} cannot be negative`);
  }

  return {
    numerator: ratio.numerator,
    denominator: ratio.denominator,
  };
};

export const fromNairaToKoboAmount = (
  amount: DecimalValue,
  fieldName: string,
): bigint => {
  const normalizedAmount =
    typeof amount === 'number' ? amount.toString() : amount.trim();

  if (normalizedAmount.startsWith('-')) {
    throw new BadRequestException(`${fieldName} cannot be negative`);
  }

  if (!/^\d+(\.\d{1,2})?$/.test(normalizedAmount)) {
    throw new BadRequestException(
      `${fieldName} must be a valid amount with at most 2 decimal places`,
    );
  }

  return MoneyValueConverter.fromNairaToKobo(normalizedAmount);
};

export function axiosConfig(
  merchantEnvironment: string,
  token: string,
): AxiosRequestConfig {
  const axiosConfig: AxiosRequestConfig = {
    timeout: 25000,
    headers: { AccessToken: token },
  };

  if (merchantEnvironment === RequestEnvironment.LIVE) {
    axiosConfig.httpsAgent = httpsAgent;
  }

  return axiosConfig;
}

export function randomNumber(length: number): string {
  const NUMERIC_VALUES = '01234567890';
  return Array.from({ length }, () => {
    const index = randomInt(NUMERIC_VALUES.length);

    return NUMERIC_VALUES[index];
  }).join('');
}

export function generateRrn(): string {
  const timestamp = Date.now().toString().slice(-8); // last 8 digits of unix ms
  const random = randomNumber(4); // 4 random digits
  return `${timestamp}${random}`; // 12 digits total
}
