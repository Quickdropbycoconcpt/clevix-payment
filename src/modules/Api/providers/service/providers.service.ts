import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { ProviderServiceType } from 'src/shared/enum';
import { Providers } from '../entity/providers.entity';

@Injectable()
export class ProviderService {
  constructor(
    @InjectRepository(Providers)
    private readonly providerRepo: Repository<Providers>,
  ) {}

  async getProviders(serviceType?: ProviderServiceType): Promise<Providers[]> {
    return this.providerRepo.find({
      where: serviceType ? { serviceType } : {},
      order: { serviceType: 'ASC', name: 'ASC' },
    });
  }

  async getActiveProviderForService(
    serviceType: ProviderServiceType,
  ): Promise<Providers> {
    const provider = await this.providerRepo.findOne({
      where: { serviceType, isActive: true },
    });

    if (!provider) {
      throw new NotFoundException(`No active provider for ${serviceType}`);
    }

    return provider;
  }

  async getProvider(
    value: string,
    serviceType: ProviderServiceType,
  ): Promise<Providers> {
    const provider = await this.providerRepo.findOne({
      where: { value: value?.trim().toLowerCase(), serviceType },
    });

    if (!provider) {
      throw new NotFoundException(
        `Provider ${value} not found for ${serviceType}`,
      );
    }

    return provider;
  }

  async getActiveProvider(
    value: string,
    serviceType: ProviderServiceType,
  ): Promise<Providers> {
    const provider = await this.getProvider(value, serviceType);

    if (!provider.isActive) {
      throw new BadRequestException(
        `Provider ${provider.name} is not active for ${serviceType}`,
      );
    }

    return provider;
  }

  async setProviderStatus(
    value: string,
    serviceType: ProviderServiceType,
    isActive: boolean,
  ): Promise<Providers> {
    const provider = await this.getProvider(value, serviceType);

    return this.providerRepo.manager.transaction(async (manager) => {
      const repo = manager.getRepository(Providers);

      if (isActive) {
        await repo.update(
          { serviceType, isActive: true, providerId: Not(provider.providerId) },
          { isActive: false },
        );
      }

      provider.isActive = isActive;

      return repo.save(provider);
    });
  }
}
