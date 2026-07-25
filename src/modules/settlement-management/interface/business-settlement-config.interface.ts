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
