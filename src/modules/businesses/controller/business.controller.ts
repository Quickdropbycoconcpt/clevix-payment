import type { RequestScope } from 'src/shared/business-scope';
import { BusinessService } from '../service/business.service';
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Logger,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from 'src/modules/authentication/decorators/current-user.decorator';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/authentication/guards/jwt-auth.guard';
import { BusinessContextGuard } from 'src/modules/authentication/guards/business-context.guard';
import { CreateBusinessDto } from '../dto/business.dto';

@Controller('business')
@ApiTags('Business Management')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard)
export class BusinessController {
  constructor(private readonly businessService: BusinessService) {}

  private readonly logger = new Logger(BusinessController.name);

  @Post()
  async createBusiness(
    @Body() dto: CreateBusinessDto,
    @CurrentUser() scope: RequestScope,
  ) {
    try {
      return await this.businessService.createBusinessForUser(
        scope.userId,
        dto,
      );
    } catch (error) {
      this.logger.error(error);
      throw new BadRequestException('Something went wrong');
    }
  }

  @Get()
  async fetchActiveUserBusiness(@CurrentUser() scope: RequestScope) {
    try {
      const businesses =
        await this.businessService.fetchAccountBusinesses(scope);
      return businesses;
    } catch (error) {
      this.logger.error(error);
      throw new BadRequestException('Something went wrong');
    }
  }

  @Get('details')
  @UseGuards(BusinessContextGuard)
  async fetchSingleBusiness(@CurrentUser() scope: RequestScope) {
    try {
      const businesses = await this.businessService.findBusinessById(
        scope.businessId,
      );
      return businesses;
    } catch (error) {
      this.logger.error(error);
      throw new BadRequestException('Something went wrong');
    }
  }

  @Patch('switch/:businessId')
  @UseGuards(BusinessContextGuard)
  async switchBusiness(
    @Param('businessId') businessId: string,
    @CurrentUser() scope: RequestScope,
  ) {
    try {
      return await this.businessService.switchBusiness(
        scope.userId,
        businessId,
      );
    } catch (error) {
      this.logger.error(error);
      throw new BadRequestException('Something went wrong');
    }
  }

  @Patch('environment/switch')
  @UseGuards(BusinessContextGuard)
  async switchEnvironment(@CurrentUser() scope: RequestScope) {
    try {
      return await this.businessService.environmentSwitching(scope.businessId);
    } catch (error) {
      this.logger.error(error);
      throw new BadRequestException('Something went wrong');
    }
  }
}
