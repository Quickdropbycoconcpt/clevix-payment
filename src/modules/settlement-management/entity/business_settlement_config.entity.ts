import { BaseEntity } from 'src/infrastructure/database/base_entiy';
import { IncomingPaymentSource } from 'src/shared/enum';
import { Check, Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export enum BusinessSettlementType {
  INSTANT = 'INSTANT',
  T_PLUS_1 = 'T+1',
}

export enum SettlementLocation {
  WALLET = 'WALLET',
  BANK = 'BANK',
}

@Entity('business_settlement_configs')
@Index(['businessId', 'paymentSource'], { unique: true })
@Check(`"settlementType" != 'INSTANT' OR "settlementLocation" = 'WALLET'`)
export class BusinessSettlementConfig extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  businessSettelementConfig: string;

  @Column({ type: 'enum', enum: SettlementLocation })
  settlementLocation: SettlementLocation;

  @Column({ type: 'enum', enum: IncomingPaymentSource })
  paymentSource: IncomingPaymentSource;

  @Column({ type: 'enum', enum: BusinessSettlementType })
  settlementType: BusinessSettlementType;
}
