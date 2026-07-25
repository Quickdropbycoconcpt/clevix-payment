import { BaseEntity } from 'src/infrastructure/database/base_entiy';
import { Column, Entity, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { OrganizationService } from './service_definition.entity';

@Entity('organisation_payment_rules')
export class OrganisationPaymentRules extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  paymentRuleId: string;

  @Column({ type: 'boolean', default: false })
  chargeFee: boolean;

  @Column({ type: 'boolean' })
  acceptPartPayment: boolean;

  @Column({ type: 'int', nullable: true })
  invoiceExpiryMinutes: number;

  @Column({ type: 'varchar' })
  currencyCode: string;

  @OneToOne(() => OrganizationService, (service) => service.paymentrule)
  service: OrganizationService;
}
