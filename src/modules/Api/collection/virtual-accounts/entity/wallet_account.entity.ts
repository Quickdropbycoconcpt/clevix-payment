import { BaseEntity } from 'src/infrastructure/database/base_entiy';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AccountType } from '../dto/create-static-account.dto';
import { Businesses } from 'src/modules/businesses/entity/business.entity';

@Entity('static_account_wallets')
export class StaticWalletAccounts extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  walletAccountId: string;

  @Column({ type: 'varchar' })
  accountNumber: string;

  @Column({ type: 'varchar' })
  accountName: string;

  @Column({ type: 'enum', enum: AccountType })
  accountType: string;

  @Column()
  provider: string;

  @Column({ type: 'uuid' })
  businessId: string;

  @Column({ type: 'varchar', nullable: true })
  address: string;

  @Column({ type: 'varchar', nullable: true })
  bvn: string;

  @Column({ type: 'varchar', nullable: true })
  nin: string;

  @Column({ type: 'varchar', nullable: true })
  rcNumber: string;

  @ManyToOne(() => Businesses)
  @JoinColumn({ name: 'businessId' })
  business: Businesses;
}
