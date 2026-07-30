import { BaseEntity } from 'src/infrastructure/database/base_entiy';
import { OrganizationType } from 'src/shared/enum';
import { Column, Entity, JoinColumn, PrimaryGeneratedColumn } from 'typeorm';

@Entity('business_information')
export class BusinessInformation extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  businessInformationId: string;

  @Column({ nullable: true, type: 'varchar' })
  regNumber: string;

  @Column({ type: 'varchar' })
  addressOne: string;

  @Column({ nullable: true })
  addressTwo: string;

  @Column({ enum: OrganizationType, type: 'enum' })
  businessType: OrganizationType;

  @Column({ nullable: true, type: 'varchar' })
  businessPhoneNumber: string;

  @Column({ type: 'varchar' })
  businessEmail: string;

  @Column({ type: 'uuid' })
  stateId: string;

  @Column({ type: 'uuid', nullable: true })
  lgId: string;

  @Column({ type: 'varchar' })
  city: string;
}
