import { OwnerlessBaseEntity } from 'src/infrastructure/database/base_entiy';
import {
  Column,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import {
  LedgerAccountOwnerType,
  LedgerAccountType,
} from '../enums/ledger.enums';
import { LedgerEntry } from './ledger-entry.entity';

@Entity('ledger_accounts')
@Index(['ownerType', 'ownerId', 'accountType', 'currency', 'environment'], {
  unique: true,
})
export class LedgerAccount extends OwnerlessBaseEntity {
  @PrimaryGeneratedColumn('uuid')
  ledgerAccountId: string;

  @Column({ enum: LedgerAccountOwnerType })
  ownerType: LedgerAccountOwnerType;

  @Column({ type: 'varchar', nullable: true })
  ownerId: string;

  @Column({ enum: LedgerAccountType })
  accountType: LedgerAccountType;

  @Column({ type: 'bigint', default: 0 })
  balance: string;

  @Column({ type: 'varchar', length: 3 })
  currency: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @OneToMany(() => LedgerEntry, (entry) => entry.ledgerAccount)
  entries: LedgerEntry[];
}
