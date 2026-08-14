import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { User } from '../entity/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import * as argon from 'argon2';
import { CreateAccountDto } from '../../authentication/dto/auth.dto';
import { BusinessService } from 'src/modules/businesses/service/business.service';
import { WalletService } from 'src/modules/wallets/service/wallets.service';
import { BusinessMembersService } from 'src/modules/business-members/service/business-members.service';
import { CountryService } from 'src/modules/country-and-states/service/country.service';
import { BusinessRolesService } from 'src/modules/business-members/service/business-roles.service';
import { UserDto } from '../dto/user.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly businessService: BusinessService,
    private readonly businessMemberService: BusinessMembersService,
    private readonly businessRolesService: BusinessRolesService,
    private readonly countryService: CountryService,
    private readonly walletService: WalletService,
  ) {}

  private readonly logger = new Logger(UserService.name);

  async setupNewAccount(dto: CreateAccountDto) {
    return this.userRepo.manager.transaction(async (entityManager) => {
      const email = dto.email.toLowerCase().trim();
      const phoneNumber = dto.phoneNumber.trim();
      const existingUser = await entityManager.findOne(User, {
        where: { email },
      });
      const country = await this.countryService.getCountryById(dto.countryId);
      if (!country) {
        throw new BadRequestException('Country selected is not supported');
      }
      const numberUsed = await entityManager.findOne(User, {
        where: { phoneNumber },
      });
      if (existingUser) {
        throw new ConflictException('Email already exists');
      }

      if (numberUsed) {
        throw new ConflictException('Phone number already exists');
      }

      const user = entityManager.create(User, {
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        email,
        phoneNumber: dto.phoneNumber.trim(),
        dialCode: dto.diaCode,
        password: await argon.hash(dto.password),
      });

      const savedUser = await entityManager.save(user);
      const savedBusiness = await this.businessService.setupNewBusiness(
        {
          businessAddress: dto.businessAddress,
          businessPhone: dto.phoneNumber,
          businessName: dto.businessName,
          countryId: dto.countryId,
          stateId: dto.stateId,
          lgId: dto.lgId,
        },
        entityManager,
      );

      await this.walletService.setupNewBusinessWallet(
        {
          countryId: dto.countryId,
          businessId: savedBusiness.businessId,
          currency: country.currency,
        },
        entityManager,
      );
      const ownerRole =
        await this.businessRolesService.createAdminRoleWithAllPermissions(
          savedBusiness.businessId,
          entityManager,
        );
      await this.businessMemberService.createOwnerMembership(
        {
          roleId: ownerRole.roleId,
          userId: savedUser.userId,
          businessId: savedBusiness.businessId,
        },
        entityManager,
      );
      await entityManager.update(
        User,
        { userId: savedUser.userId },
        { activeBusinessId: savedBusiness.businessId },
      );
      const { password, ...account } = savedUser;

      return {
        ...account,
        activeBusinessId: savedBusiness.businessId,
      };
    });
  }

  async dashBoardAuthentication(email: string) {
    const user = await this.userRepo.findOne({
      where: { email: email.toLowerCase().trim() },
      select: { password: true, userId: true },
    });

    if (!user) {
      throw new BadRequestException('Account not found');
    }

    const activeBusinessMemberships =
      await this.businessMemberService.findActiveMembershipsByUser(user.userId);
    const activeBusinessMembership =
      activeBusinessMemberships.find(
        (membership) => membership.businessId === user.activeBusinessId,
      ) ??
      (activeBusinessMemberships.length === 1
        ? activeBusinessMemberships[0]
        : null);
    const activeBusiness = activeBusinessMembership?.business ?? null;
    const roleId = activeBusinessMembership?.roleId ?? null;
    const allowedPermissions =
      await this.businessRolesService.getUserPermissionInBusiness(roleId ?? '');
    return {
      user,
      activeBusiness,
      allowedPermissions,
      activeBusinessMemberships,
      environment: activeBusiness?.environment ?? 'TEST',
    };
  }

  async getActiveBusinessId(userId: string): Promise<string | null> {
    const user = await this.userRepo.findOne({
      where: { userId },
      select: {
        userId: true,
        activeBusinessId: true,
      },
    });

    return user?.activeBusinessId ?? null;
  }

  async switchEnvironment(businessId: string) {
    try {
      const businesses =
        await this.businessService.environmentSwitching(businessId);
      return businesses;
    } catch (error) {
      this.logger.error(error);
      throw new BadRequestException('Something went wrong');
    }
  }

  async profile(userId: string) {
    try {
      const profile = await this.userRepo.findOne({ where: { userId } });
      return { profile };
    } catch (error) {
      this.logger.error(error);
      throw new BadRequestException('Something went wrong');
    }
  }

  async changePassword(userId: string | undefined, input: UserDto) {
    if (!userId) {
      throw new UnauthorizedException('Invalid request user');
    }

    const user = await this.userRepo.findOne({
      where: { userId },
      select: {
        userId: true,
        password: true,
      },
    });

    if (!user) {
      throw new BadRequestException('Account not found');
    }

    const oldPasswordValid = await argon.verify(
      user.password,
      input.oldPassword,
    );

    if (!oldPasswordValid) {
      throw new BadRequestException('Your previous password is incorrect');
    }

    const samePassword = await argon.verify(user.password, input.newPassword);

    if (samePassword) {
      throw new BadRequestException(
        'New password cannot be the same as old password',
      );
    }

    await this.userRepo.update(
      { userId },
      { password: await argon.hash(input.newPassword) },
    );

    return { message: 'Password changed successfully' };
  }

  async verifyEmail(userId: string) {
    return await this.userRepo.update({ userId }, { isEmailVerified: true });
  }

  async resetPassword(userId: string, newPassword: string) {
    const user = await this.userRepo.findOne({ where: { userId } });

    if (!user) {
      throw new BadRequestException('Account not found');
    }

    await this.userRepo.update(
      { userId },
      { password: await argon.hash(newPassword) },
    );

    return { message: 'Password reset successfully' };
  }
}
