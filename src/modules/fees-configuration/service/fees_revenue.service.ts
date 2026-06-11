import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DecimalValue,
  IntegerAmount,
  fromNairaToKoboAmount,
  toIntegerAmountBigInt,
  toRateRatio,
} from 'src/shared/utils';
import { Repository } from 'typeorm';
import { BusinessFeeConfiguration } from '../entity/business_fee_config.entity';
import { PlatformFeeConfiguration } from '../entity/platformFee_config.entity';

type FeeAmount = IntegerAmount;
type FeeCalculationInput = {
  useFlatFee: boolean;
  flatFee: DecimalValue;
  percentageFee: DecimalValue;
  percentageFeeCap: DecimalValue;
};

@Injectable()
export class FeeConfigurationService {
  constructor(
    @InjectRepository(PlatformFeeConfiguration)
    private readonly platformFeeRepo: Repository<PlatformFeeConfiguration>,
    @InjectRepository(BusinessFeeConfiguration)
    private readonly businessFeeRepo: Repository<BusinessFeeConfiguration>,
  ) {}

  async getFeeBySource(
    feeSource: string,
    businessId: string,
    provider: string,
    amount: FeeAmount,
  ): Promise<{ providerFee: bigint; chargedFee: bigint; provider: string }> {
    const normalizedProvider = provider.trim();
    const normalizedFeeSource = feeSource.trim();
    const normalizedBusinessId = businessId.trim();
    const amountInKobo = toIntegerAmountBigInt(amount, 'amount');

    if (!normalizedProvider || !normalizedFeeSource || !normalizedBusinessId) {
      throw new BadRequestException(
        'Provider, fee source and business id are required',
      );
    }

    const platformConfig = await this.platformFeeRepo.findOne({
      where: { provider: normalizedProvider, feeSource: normalizedFeeSource },
    });

    if (!platformConfig) {
      throw new BadRequestException(
        `Platform fee not setup for ${normalizedProvider}`,
      );
    }

    const providerFee = this.calculateFee(
      {
        useFlatFee: platformConfig.useFlatFee,
        flatFee: platformConfig.providerflatFee,
        percentageFee: platformConfig.providerPercentageFee,
        percentageFeeCap: platformConfig.providerPercentageFeeCap,
      },
      amountInKobo,
    );

    const platformChargedFee = this.calculateFee(
      {
        useFlatFee: platformConfig.useFlatFee,
        flatFee: platformConfig.platformflatFee,
        percentageFee: platformConfig.platformPercentageFee,
        percentageFeeCap: platformConfig.PlatformPercentageFeeCap,
      },
      amountInKobo,
    );

    const businessConfig = await this.businessFeeRepo.findOne({
      where: {
        businessId: normalizedBusinessId,
        platformFeeId: platformConfig.platformFeeId,
      },
    });

    const chargedFee = businessConfig
      ? this.calculateFee(
          {
            useFlatFee: businessConfig.useFlatFee,
            flatFee: businessConfig.businessFeeFlat,
            percentageFee: businessConfig.businessPercentageFee,
            percentageFeeCap: businessConfig.businessPercentageFeeCap,
          },
          amountInKobo,
        )
      : platformChargedFee;

    return {
      providerFee,
      chargedFee,
      provider: platformConfig.provider,
    };
  }

  private calculateFee(
    config: FeeCalculationInput,
    amountInKobo: bigint,
  ): bigint {
    if (config.useFlatFee) {
      return fromNairaToKoboAmount(config.flatFee, 'flatFee');
    }

    const feeRate = toRateRatio(config.percentageFee, 'percentageFee');
    if (feeRate.numerator <= 0n) {
      return 0n;
    }

    const numeratorProduct = amountInKobo * feeRate.numerator;
    /***Fees are always rounding up to  esnure amount are charged
     *
     */
    const fee =
      (numeratorProduct + feeRate.denominator - 1n) / feeRate.denominator;
    const cap = fromNairaToKoboAmount(
      config.percentageFeeCap,
      'percentageFeeCap',
    );

    return cap > 0n && fee > cap ? cap : fee;
  }
}
