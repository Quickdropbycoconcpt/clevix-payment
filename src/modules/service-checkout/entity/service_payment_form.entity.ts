import { OwnerlessBaseEntity } from 'src/infrastructure/database/base_entiy';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { OrganizationService } from './service_definition.entity';
import { OrganisationFormOption } from './service_payment_form_option.entity';

export enum FormType {
  TEXT = 'text',
  EMAIL = 'email',
  NUMBER = 'number',
  TEL = 'tel',
  DATE = 'date',
  CHECKBOX = 'checkbox',
  RADIO = 'radio',
  SELECT = 'select',
  TEXTAREA = 'textarea',
  FILE = 'file',
}

export enum FormOwnerType {
  SERVICE = 'service',
  PLATFORM = 'platform',
}

@Entity('organisation_custom_forms')
export class OrganisationCustomForm extends OwnerlessBaseEntity {
  @PrimaryGeneratedColumn('uuid')
  formId: string;

  @Column({ type: 'enum', enum: FormType })
  formType: FormType;

  @Column({ type: 'varchar' })
  formKey: string;

  @Column({ type: 'varchar' })
  formLabel: string;

  @Column({ type: 'varchar' })
  formLength: string;

  @Column({ type: 'varchar' })
  sequenceNo: string;

  @Column({ type: 'varchar' })
  required: string;

  @Column({ type: 'boolean', default: false })
  isMandatory: boolean;

  @Column({ type: 'enum', enum: FormOwnerType })
  ownerType: FormOwnerType;

  @Column({ type: 'uuid', nullable: true })
  ownerId: string;

  @OneToMany(() => OrganisationFormOption, (option) => option.customForm)
  options: OrganisationFormOption[];

  @ManyToOne(() => OrganizationService, (service) => service.customForms)
  @JoinColumn({ name: 'ownerId' })
  service: OrganizationService;
}
