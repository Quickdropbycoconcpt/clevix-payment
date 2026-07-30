import { BaseEntity } from 'src/infrastructure/database/base_entiy';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

export enum IdentificationType {
  NIN = 'NIN',
  BVN = 'BVN',
  INTERNATIONAL_PASSPORT = 'INTERNATIONAL_PASSPORT',
  DRIVERS_LICENSE = 'DRIVERS_LICENSE',
  VOTERS_CARD = 'VOTERS_CARD',
}

export enum RepresentativeRole {
  OWNER = 'OWNER',
  DIRECTOR = 'DIRECTOR',
  CEO = 'CEO',
  CFO = 'CFO',
  FINANCE_MANAGER = 'FINANCE_MANAGER',
  ADMINISTRATOR = 'ADMINISTRATOR',
  ICT_MANAGER = 'ICT_MANAGER',
  AUTHORIZED_SIGNATORY = 'AUTHORIZED_SIGNATORY',
  OTHER = 'OTHER',
}

@Entity('business_representatives')
export class BusinessRepresentatives extends BaseEntity {
  @PrimaryGeneratedColumn()
  businessRepresentativeId: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ nullable: true })
  middleName: string;

  @Column()
  email: string;

  @Column()
  phoneNumber: string;

  @Column({
    type: 'enum',
    enum: RepresentativeRole,
  })
  role: RepresentativeRole;

  @Column({
    type: 'enum',
    enum: IdentificationType,
  })
  identificationType: IdentificationType;

  @Column()
  identificationNumber: string;

  @Column({ nullable: true })
  identificationDocument: string;

  @Column({ default: false })
  isPrimaryContact: boolean;
}
