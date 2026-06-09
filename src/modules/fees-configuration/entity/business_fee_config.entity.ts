import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PlatformFeeConfiguration } from './platformFee_config.entity';

@Index(['businessId', 'platformFeeId'], { unique: true })
@Entity('business_fee_configuration')
export class BusinessFeeConfiguration {
  @PrimaryGeneratedColumn('uuid')
  businessFeeId: string;

  @Column({ type: 'uuid' })
  businessId: string;

  @Column({ type: 'uuid' })
  platformFeeId: string;

  @Column({ type: 'decimal', default: 0 })
  businessPercentageFee: number;

  @Column({ type: 'decimal', default: 0 })
  businessPercentageFeeCap: number;

  @Column({ type: 'int', default: 0 })
  businessFeeFlat: number;

  @Column({ type: 'boolean', default: false })
  useFlatFee: boolean;

  @ManyToOne(() => PlatformFeeConfiguration, (p) => p.businesses)
  @JoinColumn({ name: 'platformFeeId' })
  platformConfiguration: PlatformFeeConfiguration;
}
