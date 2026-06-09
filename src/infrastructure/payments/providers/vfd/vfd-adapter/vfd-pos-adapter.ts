import { Injectable } from '@nestjs/common';
import {
  CollectionProvider,
  CollectionSource,
} from 'src/modules/Api/collection/adapters/contracts/collection-adapter.types';
import {
  ChargePosInput,
  ChargePosResult,
  PosAdapter,
} from 'src/modules/Api/collection/adapters/contracts/pos.adapter';
import { VfdClient } from '../vfd.client';

@Injectable()
export class VfdPosProvider implements PosAdapter {
  readonly provider = CollectionProvider.VFD;

  constructor(private readonly vfdClient: VfdClient) {}

  async chargePos(input: ChargePosInput): Promise<ChargePosResult> {
    const response = await this.vfdClient.chargePos(input);

    return {
      provider: this.provider,
      source: CollectionSource.POS,
      reference: input.reference,
      providerReference: response.reference,
      terminalId: response.terminal_id,
      amount: response.amount,
      currency: response.currency,
      status: response.status,
      raw: response,
    };
  }
}
