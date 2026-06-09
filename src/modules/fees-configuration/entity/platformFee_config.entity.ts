import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { BusinessFeeConfiguration } from './business_fee_config.entity';

@Entity('platform_fee_configuration')
export class PlatformFeeConfiguration {
  @PrimaryGeneratedColumn('uuid')
  platformFeeId: string;

  @Column({ type: 'varchar' })
  provider: string;

  @Column({ type: 'decimal', default: 0 })
  providerPercentageFee: number;

  @Column({ type: 'decimal', default: 0 })
  providerPercentageFeeCap: number;

  @Column({ type: 'decimal', default: 0 })
  platformPercentageFee: number;

  @Column({ type: 'decimal', default: 0 })
  PlatformPercentageFeeCap: number;

  @Column({ type: 'int', default: 0 })
  providerflatFee: number;

  @Column({ type: 'int', default: 0 })
  platformflatFee: number;

  @Column({ type: 'boolean', default: false })
  useFlatFee: boolean;

  @Column({ type: 'varchar' })
  feeSource: string;

  @OneToMany(() => BusinessFeeConfiguration, (bf) => bf.platformConfiguration)
  businesses: BusinessFeeConfiguration[];
}
