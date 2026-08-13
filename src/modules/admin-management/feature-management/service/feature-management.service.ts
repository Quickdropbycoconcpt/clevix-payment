import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BusinessAllowedFeatures } from '../entity/business-feature.entity';
import { Repository } from 'typeorm';

export type FeatureAccessCheck = {
  businessId: string;
  environment: string;
  feature: string;
};

@Injectable()
export class FeatureManagementService {
  constructor(
    @InjectRepository(BusinessAllowedFeatures)
    private readonly businessFeaturesRepo: Repository<BusinessAllowedFeatures>,
  ) {}
  async checkBusinessAccess(input: FeatureAccessCheck) {
    const feature = await this.businessFeaturesRepo.findOne({
      where: {
        isActive: true,
        environment: input.environment,
        businessId: input.businessId,
        platformFeature: {
          isActive: true,
        },
      },
    });

    return !!feature;
  }
}
