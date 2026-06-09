import { applyDecorators, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { BusinessContextGuard } from '../guards/business-context.guard';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { AccessControlGuard } from '../guards/access-control-guard';

export const BusinessDashboardAuth = () =>
  applyDecorators(
    ApiBearerAuth('bearer'),
    UseGuards(JwtAuthGuard, BusinessContextGuard, AccessControlGuard),
  );

export const BusinessDashbordAuth = BusinessDashboardAuth;
