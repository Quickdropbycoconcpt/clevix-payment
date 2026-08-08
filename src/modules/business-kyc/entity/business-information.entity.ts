import { NonEnvironmentBaseEntity } from 'src/infrastructure/database/base_entiy';
import { Businesses } from 'src/modules/businesses/entity/business.entity';
import { OrganizationType } from 'src/shared/enum';
import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('business_information')
export class BusinessInformation extends NonEnvironmentBaseEntity {
  @PrimaryGeneratedColumn('uuid')
  businessInformationId: string;

  @Column({ nullable: true, type: 'varchar' })
  regNumber: string;

  @Column({ type: 'varchar' })
  addressOne: string;

  @Column({ type: 'uuid' })
  businessId: string;

  @Column({ nullable: true })
  addressTwo: string;

  @Column({ enum: OrganizationType, type: 'enum' })
  businessType: OrganizationType;

  @Column({ type: 'varchar' })
  businessEmail: string;

  @Column({ type: 'varchar' })
  city: string;

  @OneToOne(() => Businesses, (biz) => biz.info)
  @JoinColumn({ name: 'businessId' })
  business: Businesses;
}
