import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IncomingPaymentSource } from 'src/shared/enum';
import { getBusinessScope, RequestScope } from 'src/shared/business-scope';
import {
  BusinessSettlementConfig,
  BusinessSettlementType,
  SettlementLocation,
} from '../entity/business_settlement_config.entity';
import { UpsertBusinessSettlementConfig } from '../interface/business-settlement-config.interface';

@Injectable()
export class BusinessSettlementConfigurationService {
  constructor(
    @InjectRepository(BusinessSettlementConfig)
    private readonly configRepo: Repository<BusinessSettlementConfig>,
  ) {}

  async upsertConfig(
    input: UpsertBusinessSettlementConfig,
    scope: RequestScope,
  ) {
    if (
      input.settlementType === BusinessSettlementType.INSTANT &&
      input.settlementLocation !== SettlementLocation.WALLET
    ) {
      throw new BadRequestException(
        'INSTANT settlement is only supported when settlementLocation is WALLET',
      );
    }

    const { businessId, environment } = getBusinessScope(scope);

    const existing = await this.configRepo.findOne({
      where: {
        businessId,
        environment,
        paymentSource: input.paymentSource,
      },
    });

    if (existing) {
      existing.settlementType = input.settlementType;
      existing.settlementLocation = input.settlementLocation;

      return this.configRepo.save(existing);
    }

    const config = this.configRepo.create({
      businessId,
      environment,
      paymentSource: input.paymentSource,
      settlementType: input.settlementType,
      settlementLocation: input.settlementLocation,
    });

    return this.configRepo.save(config);
  }

  async getConfig(scope: RequestScope, paymentSource: IncomingPaymentSource) {
    const { businessId, environment } = getBusinessScope(scope);

    return this.configRepo.findOne({
      where: { businessId, environment, paymentSource },
    });
  }

  async getConfigs(scope: RequestScope) {
    const { businessId, environment } = getBusinessScope(scope);

    return this.configRepo.find({ where: { businessId, environment } });
  }
}
