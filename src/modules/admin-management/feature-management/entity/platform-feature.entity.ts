import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { BusinessAllowedFeatures } from './business-feature.entity';

@Entity('global_platform_features')
export class PlatFormFeatures {
  @PrimaryGeneratedColumn('uuid')
  featureId: string;

  @Column({ type: 'varchar' })
  feature: string;

  @Column({ type: 'boolean', default: false })
  isActive: boolean;

  @OneToMany(() => BusinessAllowedFeatures, (biz) => biz.platformFeature)
  businessFeatures: BusinessAllowedFeatures[];
}
