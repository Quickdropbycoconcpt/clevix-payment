import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { CollectionAdapterFactory } from '../../adapters/collection.adapter.factory';
import { CollectionProvider } from '../../adapters/contracts/collection-adapter.types';
import { ChargePosResult } from '../../adapters/contracts/pos.adapter';
import { ChargePosDto } from '../dto/charge-pos.dto';
import { RequestScope, getBusinessScope } from 'src/shared/business-scope';

@Injectable()
export class PosService {
  constructor(
    private readonly collectionAdapterFactory: CollectionAdapterFactory,
  ) {}

  async chargePos(
    dto: ChargePosDto,
    scope: RequestScope,
  ): Promise<ChargePosResult> {
    const businessScope = getBusinessScope(scope);
    const provider = dto.provider ?? CollectionProvider.VFD;
    const adapter = this.collectionAdapterFactory.getPosAdapter(provider);

    return adapter.chargePos({
      ...businessScope,
      reference: dto.reference ?? this.generateReference(),
      terminalId: dto.terminalId.trim(),
      amount: dto.amount,
      currency: dto.currency?.trim().toUpperCase() ?? 'NGN',
      customerEmail: dto.customerEmail?.trim().toLowerCase(),
      metadata: dto.metadata,
    });
  }

  private generateReference(): string {
    return `pos_${randomUUID()}`;
  }
}
