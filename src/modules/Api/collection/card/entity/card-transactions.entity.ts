import { BaseEntity } from 'src/infrastructure/database/base_entiy';
import { TransactionStatus } from 'src/shared/enum';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

export enum CardAuthType {
  REDIRECT_URL = 'REDIRECT_URL',
  OTP_VALIDATE = 'OTP_VALIDATE',
}
@Entity('card_transactions')
export class CardTransactions extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  cardTransactionId: string;

  @Column({ type: 'bigint' })
  amount: string;

  @Column({ type: 'bigint', nullable: true })
  feeCharged: string;

  @Column({ nullable: true, type: 'varchar' })
  cardType: string;

  @Column({ type: 'enum', enum: CardAuthType, nullable: true })
  authorizationType: CardAuthType;

  @Column({
    type: 'enum',
    enum: TransactionStatus,
    default: TransactionStatus.INITIATED,
  })
  status: TransactionStatus;

  @Column({ type: 'varchar', unique: true })
  reference: string;
}
