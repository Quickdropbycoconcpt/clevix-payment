import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EntityManager, Repository } from 'typeorm';
import { Businesses } from '../entity/business.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { SetupNewBusiness } from '../interface/business.interface';
import { KycStatus, RequestEnvironment } from 'src/shared/enum';
import { randomInt } from 'node:crypto';
import { RequestScope } from 'src/shared/business-scope';
import { BusinessMembersService } from 'src/modules/business-members/service/business-members.service';
import { User } from 'src/modules/users/entity/user.entity';
import { CountryService } from 'src/modules/country-and-states/service/country.service';
import { WalletService } from 'src/modules/wallets/service/wallets.service';
import { BusinessRolesService } from 'src/modules/business-members/service/business-roles.service';

const BUSINESS_IDENTIFIER_LENGTH = 12;
const BUSINESS_IDENTIFIER_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

@Injectable()
export class BusinessService {
  constructor(
    @InjectRepository(Businesses)
    private readonly businessRepo: Repository<Businesses>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly businessMemberService: BusinessMembersService,
    private readonly businessRolesService: BusinessRolesService,
    private readonly countryService: CountryService,
    private readonly walletService: WalletService,
  ) {}

  async setupNewBusiness(
    input: SetupNewBusiness,
    entityManager?: EntityManager,
  ) {
    const businessIdentifier =
      await this.generateBusinessIdentifier(entityManager);

    if (entityManager) {
      const businessEntity = entityManager.create(Businesses, {
        ...input,
        businessIdentifier,
        environment: RequestEnvironment.TEST,
      });
      return await entityManager.save(businessEntity);
    }

    const entity = this.businessRepo.create({
      ...input,
      businessIdentifier,
      environment: RequestEnvironment.TEST,
    });

    return await this.businessRepo.save(entity);
  }

  async createBusinessForUser(userId: string, input: SetupNewBusiness) {
    return this.businessRepo.manager.transaction(async (entityManager) => {
      const country = await this.countryService.getCountryById(input.countryId);
      if (!country) {
        throw new NotFoundException('Country not found');
      }

      const business = await this.setupNewBusiness(
        {
          businessAddress: input.businessAddress.trim(),
          businessPhone: input.businessPhone.trim(),
          businessName: input.businessName.trim(),
          countryId: input.countryId,
          stateId: input.stateId,
          lgId: input.lgId,
        },
        entityManager,
      );

      await this.walletService.setupNewBusinessWallet(
        {
          countryId: input.countryId,
          businessId: business.businessId,
          currency: country.currency,
        },
        entityManager,
      );

      const ownerRole =
        await this.businessRolesService.createAdminRoleWithAllPermissions(
          business.businessId,
          entityManager,
        );

      await this.businessMemberService.createOwnerMembership(
        {
          roleId: ownerRole.roleId,
          userId,
          businessId: business.businessId,
        },
        entityManager,
      );

      await entityManager.update(
        User,
        { userId },
        { activeBusinessId: business.businessId },
      );

      return {
        businessId: business.businessId,
        businessName: business.businessName,
        businessIdentifier: business.businessIdentifier,
        environment: business.environment,
        role: {
          name: ownerRole.name,
        },
        permissions:
          ownerRole.permissions?.map(
            (rolePermission) => rolePermission.permission.key,
          ) ?? [],
      };
    });
  }

  async fetchAccountBusinesses(scope: RequestScope) {
    const activeBusinessMemberships =
      await this.businessMemberService.findActiveMembershipsByUser(
        scope.userId,
      );
    return activeBusinessMemberships.map((membership) => ({
      businessId: membership.business.businessId,
      businessName: membership.business.businessName,
      businessIdentifier: membership.business.businessIdentifier,
      environment: membership.business.environment,
      role: {
        name: membership.role.name,
      },
    }));
  }

  async switchBusiness(userId: string, businessId: string) {
    const membership =
      await this.businessMemberService.findActiveBusinessMembership(
        userId,
        businessId,
      );

    if (!membership) {
      throw new NotFoundException('Business not found');
    }

    await this.userRepo.update({ userId }, { activeBusinessId: businessId });

    return {
      businessId: membership.business.businessId,
      businessName: membership.business.businessName,
      businessIdentifier: membership.business.businessIdentifier,
      environment: membership.business.environment,
      role: {
        name: membership.role.name,
      },
      permissions:
        membership.role.permissions?.map(
          (rolePermission) => rolePermission.permission.key,
        ) ?? [],
    };
  }

  async findBusinessById(businessId: string) {
    return await this.businessRepo.findOne({
      where: { businessId },
      relations: {
        country: true,
        info: true,
        state: true,
      },
      select: {
        businessId: true,
        businessAddress: true,
        businessName: true,
        businessPhone: true,
        businessIdentifier: true,
        environment: true,
        kycStatus: true,
        info: true,
        state: {
          name: true,
          stateId: true,
        },
        country: {
          countryId: true,
          countryCode: true,
          phoneCode: true,
          name: true,
        },
      },
    });
  }

  async findBusinessByIdentifier(businessIdentifier?: string | null) {
    const identifier = businessIdentifier?.trim();

    if (!identifier) {
      return null;
    }

    return await this.businessRepo.findOne({
      where: { businessIdentifier: identifier },
    });
  }

  private async generateBusinessIdentifier(
    entityManager?: EntityManager,
  ): Promise<string> {
    const repository =
      entityManager?.getRepository(Businesses) ?? this.businessRepo;

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const identifier = this.randomString(BUSINESS_IDENTIFIER_LENGTH);
      const existingBusiness = await repository.findOne({
        where: { businessIdentifier: identifier },
      });

      if (!existingBusiness) {
        return identifier;
      }
    }

    throw new ConflictException(
      'Unable to generate unique business identifier',
    );
  }

  private randomString(length: number): string {
    return Array.from({ length }, () => {
      const index = randomInt(BUSINESS_IDENTIFIER_ALPHABET.length);

      return BUSINESS_IDENTIFIER_ALPHABET[index];
    }).join('');
  }

  async environmentSwitching(businessId: string) {
    const biz = await this.businessRepo.findOne({ where: { businessId } });

    if (!biz) {
      throw new NotFoundException('Business not found');
    }

    const environment =
      biz.environment == RequestEnvironment.TEST
        ? RequestEnvironment.LIVE
        : RequestEnvironment.TEST;

    await this.businessRepo.update({ businessId }, { environment });

    return { businessId, environment };
  }

  async moveBusinessKycToReview(businessId: string) {
    return await this.businessRepo.update(
      { businessId },
      { kycStatus: KycStatus.IN_REVIEW },
    );
  }
}
