import { IncomingPaymentSource } from 'src/shared/enum';
import {
  BusinessSettlementType,
  SettlementLocation,
} from '../entity/business_settlement_config.entity';

export type UpsertBusinessSettlementConfig = {
  paymentSource: IncomingPaymentSource;
  settlementType: BusinessSettlementType;
  settlementLocation: SettlementLocation;
};

export type ExternalBankSettlement = {
  amount: string;

  accountNumber: string;

  accountName: string;

  currency: string;

  bankCode: string;

  reference: string;

  environment: string;

  narration?: string;

  senderAccount?: string;

  merchantReference?: string;
};
