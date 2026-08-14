import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from 'src/modules/authentication/decorators/current-user.decorator';
import type { RequestScope } from 'src/shared/business-scope';
import {
  BusinessDocumentsDto,
  BusinessRepresentativesDto,
  SubmitBusinessInfoDto,
} from '../dto/business-kyc.dto';
import { BusinessKycService } from '../service/business-kyc.service';
import { BusinessDashboardAuth } from 'src/modules/authentication/decorators/business-dashboard-auth.decorator';

@Controller('v1/business-kyc')
@ApiTags('Business Kyc Management')
@ApiBearerAuth('bearer')
@BusinessDashboardAuth()
export class BusinessKycController {
  constructor(private readonly businessKycService: BusinessKycService) {}
  @Post('add-representatives')
  async addBusinessRepresentative(
    @Body() payload: BusinessRepresentativesDto,
    @CurrentUser() scope: RequestScope,
  ) {
    const rep = await this.businessKycService.addBusinessRepresentatives(
      payload,
      scope,
    );
    return rep;
  }

  @Post('submit-information')
  async submitBusinessInformation(
    @Body() payload: SubmitBusinessInfoDto,
    @CurrentUser() scope: RequestScope,
  ) {
    const rep = await this.businessKycService.addBusinessInformation(
      payload,
      scope,
    );
    return rep;
  }

  @Post('add-documents')
  async addBusinessDocument(
    @Body() payload: BusinessDocumentsDto,
    @CurrentUser() scope: RequestScope,
  ) {
    const doc = await this.businessKycService.addBusinessDocuments(
      payload,
      scope,
    );
    return doc;
  }

  @Get('organization-type')
  async getOrgType() {
    return this.businessKycService.getOrganizationType();
  }

  @Get('current-stage')
  async getKycCurrentStage(@CurrentUser() scope: RequestScope) {
    return this.businessKycService.kycStage(scope);
  }
}
