import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { BusinessMember } from '../entity/business-member.entity';
import { BusinessMemberStatus } from '../enums/business-member.enums';
import { User } from 'src/modules/users/entity/user.entity';
import {
  CreateBusinessMemberInput,
  CreateBusinessOwnerInput,
} from '../interface/business-member.interface';

@Injectable()
export class BusinessMembersService {
  constructor(
    @InjectRepository(BusinessMember)
    private readonly businessMemberRepo: Repository<BusinessMember>,
  ) {}

  async createOwnerMembership(
    input: CreateBusinessOwnerInput,
    entityManager?: EntityManager,
  ): Promise<BusinessMember> {
    return this.createMembership(
      {
        ...input,
        status: BusinessMemberStatus.ACTIVE,
      },
      entityManager,
    );
  }

  async createMembership(
    input: CreateBusinessMemberInput,
    entityManager?: EntityManager,
  ): Promise<BusinessMember> {
    const repository =
      entityManager?.getRepository(BusinessMember) ?? this.businessMemberRepo;

    const existingMember = await repository.findOne({
      where: {
        businessId: input.businessId,
        userId: input.userId,
      },
    });

    if (
      existingMember &&
      existingMember.status !== BusinessMemberStatus.REMOVED
    ) {
      throw new ConflictException('User already belongs to this business');
    }

    const member = existingMember ?? repository.create();

    repository.merge(member, {
      businessId: input.businessId,
      userId: input.userId,
      roleId: input.roleId,
      status: input.status ?? BusinessMemberStatus.INVITED,
      invitedByUserId: input.invitedByUserId,
      acceptedAt:
        input.status === BusinessMemberStatus.ACTIVE ? new Date() : null,
    });

    return repository.save(member);
  }

  async findActiveMembershipsByUser(userId: string): Promise<BusinessMember[]> {
    return this.businessMemberRepo.find({
      where: {
        userId,
        status: BusinessMemberStatus.ACTIVE,
      },
      relations: {
        business: true,
        role: {
          permissions: {
            permission: true,
          },
        },
      },
      order: {
        createdAt: 'ASC',
      },
    });
  }

  async findActiveBusinessMembership(
    userId: string,
    businessId: string,
  ): Promise<BusinessMember | null> {
    return this.businessMemberRepo.findOne({
      where: {
        userId,
        businessId,
        status: BusinessMemberStatus.ACTIVE,
      },
      relations: {
        business: true,
        role: {
          permissions: {
            permission: true,
          },
        },
      },
    });
  }

  async findActiveBusinessMembershipForUser(
    userId: string,
  ): Promise<BusinessMember | null> {
    return this.businessMemberRepo
      .createQueryBuilder('membership')
      .innerJoin(User, 'activeUser', 'activeUser.userId = membership.userId')
      .leftJoinAndSelect('membership.business', 'business')
      .leftJoinAndSelect('membership.role', 'role')
      .leftJoinAndSelect('role.permissions', 'rolePermission')
      .leftJoinAndSelect('rolePermission.permission', 'permission')
      .where('membership.userId = :userId', { userId })
      .andWhere('membership.status = :status', {
        status: BusinessMemberStatus.ACTIVE,
      })
      .andWhere('membership.businessId = activeUser.activeBusinessId')
      .getOne();
  }
}
