import { applyDecorators, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';

import { ApiJwtAuthGuard } from '../guards/api-guard';
import { KycAndFeatureEligibilityGuard } from '../guards/kyc-and-feature-eligibility.guard';

export const ApiAuthGuard = () =>
  applyDecorators(
    ApiBearerAuth('bearer'),
    UseGuards(ApiJwtAuthGuard, KycAndFeatureEligibilityGuard),
  );

export const ApiGuard = ApiAuthGuard;
