import { applyDecorators, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { BusinessContextGuard } from '../guards/business-context.guard';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { AccessControlGuard } from '../guards/access-control-guard';
import { KycAndFeatureEligibilityGuard } from '../guards/kyc-and-feature-eligibility.guard';

export const BusinessDashboardAuth = () =>
  applyDecorators(
    ApiBearerAuth('bearer'),
    UseGuards(
      JwtAuthGuard,
      BusinessContextGuard,
      KycAndFeatureEligibilityGuard,
      AccessControlGuard,
    ),
  );

export const BusinessDashbordAuth = BusinessDashboardAuth;
