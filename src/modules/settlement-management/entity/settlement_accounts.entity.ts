import { BaseEntity } from 'src/infrastructure/database/base_entiy';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

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

  @Column({ type: 'varchar' })
  providerbankId: string;
}
