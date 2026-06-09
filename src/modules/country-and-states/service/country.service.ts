import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Country } from '../entity/country.entity';
import { LocalGovernment } from '../entity/local-government.entity';
import { State } from '../entity/state.entity';

@Injectable()
export class CountryService {
  constructor(
    @InjectRepository(Country)
    private readonly countryRepo: Repository<Country>,
    @InjectRepository(State)
    private readonly stateRepo: Repository<State>,
    @InjectRepository(LocalGovernment)
    private readonly localGovernmentRepo: Repository<LocalGovernment>,
  ) {}

  async getCountries(): Promise<Country[]> {
    return this.countryRepo.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });
  }

  async getCountryById(countryId: string): Promise<Country> {
    const country = await this.countryRepo.findOne({
      where: { countryId, isActive: true },
    });

    if (!country) {
      throw new NotFoundException('Country not found');
    }

    return country;
  }

  async getStatesByCountry(countryId: string): Promise<State[]> {
    await this.getCountryById(countryId);

    return this.stateRepo.find({
      where: { countryId, isActive: true },
      order: { name: 'ASC' },
    });
  }

  async getStateById(stateId: string): Promise<State> {
    const state = await this.stateRepo.findOne({
      where: { stateId, isActive: true },
    });

    if (!state) {
      throw new NotFoundException('State not found');
    }

    return state;
  }

  async getLocalGovernmentsByState(
    stateId: string,
  ): Promise<LocalGovernment[]> {
    await this.getStateById(stateId);

    return this.localGovernmentRepo.find({
      where: { stateId, isActive: true },
      order: { name: 'ASC' },
    });
  }
}
