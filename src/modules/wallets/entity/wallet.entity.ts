import { BaseEntity } from 'src/infrastructure/database/base_entiy';
import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('wallets')
@Index(['businessId', 'currency'])
export class Wallets extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  walletId: string;

  @Column({ type: 'bigint', default: 0 })
  balance: string;

  @Column({ type: 'varchar' })
  currency: string;
}
