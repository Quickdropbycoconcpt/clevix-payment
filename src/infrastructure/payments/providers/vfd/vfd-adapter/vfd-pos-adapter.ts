import { Injectable } from '@nestjs/common';
import { CollectionProvider } from 'src/modules/Api/collection/adapters/contracts/collection-adapter.types';
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
      code: response?.code,
      amount: response?.amount,
      currency: response?.currency,
      status: response?.status,
      raw: response,
    };
  }
}
