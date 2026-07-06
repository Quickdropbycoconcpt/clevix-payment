import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RequestScope, getBusinessScope } from 'src/shared/business-scope';
import { BasicStatus } from 'src/shared/enum';
import { CreateTerminalDto } from '../dto/create-terminal.dto';
import { Terminal } from '../entity/terminals.entity';

@Injectable()
export class PosTerminalService {
  constructor(
    @InjectRepository(Terminal)
    private readonly terminalRepo: Repository<Terminal>,
  ) {}

  async addTerminal(
    dto: CreateTerminalDto,
    scope: RequestScope,
  ): Promise<Terminal> {
    const businessScope = getBusinessScope(scope);
    const serialNumber = dto.serialNumber.trim();
    const providerTerminalId = dto.providerTerminalId?.trim() || null;

    const existingTerminal = await this.terminalRepo.findOne({
      where: { serialNumber },
    });

    if (existingTerminal) {
      throw new ConflictException(
        'A terminal with this serial number already exists',
      );
    }

    if (providerTerminalId) {
      const existingProviderTerminal = await this.terminalRepo.findOne({
        where: { providerTerminalId },
      });

      if (existingProviderTerminal) {
        throw new ConflictException(
          'A terminal with this provider terminal id already exists',
        );
      }
    }

    const terminal = this.terminalRepo.create({
      ...businessScope,
      serialNumber,
      provider: dto.provider,
      providerTerminalId,
      status: BasicStatus.ACTIVE,
    });

    return this.terminalRepo.save(terminal);
  }

  async findBySerialNumber(serialNumber: string): Promise<Terminal | null> {
    const trimmed = serialNumber?.trim();

    if (!trimmed) {
      return null;
    }

    return this.terminalRepo.findOne({ where: { serialNumber: trimmed } });
  }

  async activateTerminal(
    terminalId: string,
    scope: RequestScope,
  ): Promise<Terminal> {
    return this.setTerminalStatus(terminalId, scope, BasicStatus.ACTIVE);
  }

  async deactivateTerminal(
    terminalId: string,
    scope: RequestScope,
  ): Promise<Terminal> {
    return this.setTerminalStatus(terminalId, scope, BasicStatus.INACTIVE);
  }

  private async setTerminalStatus(
    terminalId: string,
    scope: RequestScope,
    status: BasicStatus,
  ): Promise<Terminal> {
    const terminal = await this.findScopedTerminal(terminalId, scope);

    this.terminalRepo.merge(terminal, { status });

    return this.terminalRepo.save(terminal);
  }

  private async findScopedTerminal(
    terminalId: string,
    scope: RequestScope,
  ): Promise<Terminal> {
    const businessScope = getBusinessScope(scope);

    const terminal = await this.terminalRepo.findOne({
      where: { terminalId, ...businessScope },
    });

    if (!terminal) {
      throw new NotFoundException('Terminal not found');
    }

    return terminal;
  }
}
