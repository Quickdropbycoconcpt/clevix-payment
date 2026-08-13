import { BaseEntity } from 'src/infrastructure/database/base_entiy';
import { Banks } from 'src/modules/Api/banks/entity/banks.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('SettlementBankAccounts')
export class SettlementBankAccounts extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  bankAccountId: string;

  @Column({ type: 'boolean', default: false })
  isPrimary: boolean;

  @Column({ type: 'varchar' })
  accountNumber: string;

  @Column({ type: 'varchar' })
  accountName: string;

  @Column({ type: 'uuid' })
  providerbankId: string;

  @ManyToOne(() => Banks)
  @JoinColumn({ name: 'providerbankId', referencedColumnName: 'bankId' })
  bank: Banks;
}
