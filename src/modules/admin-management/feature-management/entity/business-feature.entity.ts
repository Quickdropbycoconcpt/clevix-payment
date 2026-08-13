import { BaseEntity } from 'src/infrastructure/database/base_entiy';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PlatFormFeatures } from './platform-feature.entity';

@Entity('business_allowed_features')
export class BusinessAllowedFeatures extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  businessFeatureId: string;

  @Column({ type: 'varchar' })
  platformFeatureId: string;

  @Column({ type: 'boolean', default: false })
  isActive: boolean;

  @ManyToOne(() => PlatFormFeatures, (plf) => plf.businessFeatures)
  @JoinColumn({ name: 'platformFeatureId' })
  platformFeature: PlatFormFeatures;
}
