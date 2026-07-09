import { Injectable } from '@nestjs/common';
import { CollectionProvider } from 'src/modules/Api/collection/adapters/contracts/collection-adapter.types';
import {
  ChargePosInput,
  ChargePosResult,
  PosAdapter,
  PosWebhookEvent,
} from 'src/modules/Api/collection/adapters/contracts/pos.adapter';
import { VfdClient } from '../vfd.client';

type VfdPosWebhookBody = {
  pan?: string;
  rrn?: string;
  stan?: string;
  amount?: string;
  reference?: string;
  merchantId?: string;
  terminalId?: string;
  statusCode?: string;
  statusDescription?: string;
  serialNumber?: string;
  transactionDate?: string;
  cardType?: string;
  cardBank?: string;
  settledAmount?: string;
};

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

  parsePosWebhook(body: VfdPosWebhookBody): PosWebhookEvent {
    const { bin, lastFour } = this.splitMaskedPan(body?.pan);
    return {
      reference: body?.reference,
      rrn: body?.rrn,
      stan: body?.stan,
      amount: body?.amount,
      settledAmount: body?.settledAmount,
      code: body?.statusCode,
      status: body?.statusDescription,
      cardBin: bin,
      cardLastFour: lastFour,
      cardType: body?.cardType,
      cardBank: body?.cardBank,
      terminalSerialNumber: body?.serialNumber,
      providerTerminalId: body?.terminalId,
      transactionDate: body?.transactionDate,
      raw: body,
    };
  }

  private splitMaskedPan(pan?: string): { bin: string; lastFour: string } {
    const match = /^(\d+)\*+(\d+)$/.exec(pan ?? '');
    return {
      bin: match?.[1] ?? '',
      lastFour: match?.[2] ?? '',
    };
  }
}
