import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FeatureManagementService } from 'src/modules/admin-management/feature-management/service/feature-management.service';
import { BusinessService } from 'src/modules/businesses/service/business.service';
import { getBusinessScope } from 'src/shared/business-scope';
import { KycStatus, RequestEnvironment } from 'src/shared/enum';
export const FEATURE_KEY = 'feature';

@Injectable()
export class KycAndFeatureEligibilityGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly businessService: BusinessService,
    private readonly featureAccessService: FeatureManagementService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const feature = this.reflector.get<string>(
      FEATURE_KEY,
      context.getHandler(),
    );

    const scope = getBusinessScope(request.user);

    const business = await this.businessService.findBusinessById(
      scope.businessId,
    );

    if (
      business &&
      scope.environment == RequestEnvironment.LIVE &&
      business.kycStatus != KycStatus.APPROVED &&
      feature
    ) {
      throw new ForbiddenException(
        'You are required to re submit some of your documents',
      );
    }

    if (feature) {
      const hasAccess = await this.featureAccessService.checkBusinessAccess({
        businessId: scope.businessId,
        environment: scope.environment,
        feature,
      });

      if (!hasAccess) {
        throw new ForbiddenException(
          'You do not have access to this resources. Please contact support',
        );
      }
    }

    return true;
  }
}
