import { ConflictException, Injectable } from '@nestjs/common';
import { EntityManager, Repository } from 'typeorm';
import { Businesses } from '../entity/business.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { SetupNewBusiness } from '../interface/business.interface';
import { RequestEnvironment } from 'src/shared/enum';
import { randomInt } from 'node:crypto';

const BUSINESS_IDENTIFIER_LENGTH = 12;
const BUSINESS_IDENTIFIER_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

@Injectable()
export class BusinessService {
  constructor(
    @InjectRepository(Businesses)
    private readonly businessRepo: Repository<Businesses>,
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

  async findBusinessById(businessId: string) {
    return await this.businessRepo.findOne({ where: { businessId } });
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
}
