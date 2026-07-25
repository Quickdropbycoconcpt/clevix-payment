import { BaseEntity } from 'src/infrastructure/database/base_entiy';
import { BasicStatus } from 'src/shared/enum';
import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('terminals')
export class Terminal extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  terminalId: string;

  @Index({ unique: true })
  @Column({ type: 'varchar' })
  serialNumber: string;

  @Column({ type: 'varchar' })
  provider: string;

  @Column({ type: 'varchar', nullable: true, unique: true })
  providerTerminalId: string;

  @Column({ type: 'enum', enum: BasicStatus, default: BasicStatus.ACTIVE })
  status: BasicStatus;
}
