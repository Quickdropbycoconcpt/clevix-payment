import { BaseEntity } from 'src/infrastructure/database/base_entiy';
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { OrganisationCustomForm } from './service_payment_form.entity';

@Entity('organisation_form_options')
export class OrganisationFormOption extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  optionId: string;

  @Column({ type: 'varchar' })
  label: string;

  @Column({ type: 'varchar' })
  value: string;

  @Column({ type: 'varchar' })
  sequenceNo: string;

  @ManyToOne(() => OrganisationCustomForm, (form) => form.options)
  customForm: OrganisationCustomForm;
}
