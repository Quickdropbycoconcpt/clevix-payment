import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('internal_corporate_accounts')
export class InternalCoporateAccount {
  @PrimaryGeneratedColumn('uuid')
  internalAccountId: string;

  @Column({ type: 'varchar' })
  accountNumber: string;

  @Column({ type: 'varchar' })
  provider: string;

  @Column({ type: 'varchar' })
  holdType: string; //POS, CARD, TRANSFER

  @Column({ type: 'varchar' })
  bankCode: string;

  @Column({ type: 'boolean', default: false })
  isDefault: boolean;
}
