import { NonEnvironmentBaseEntity } from 'src/infrastructure/database/base_entiy';
import { VerificationStatus } from 'src/shared/enum';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

export enum IdentificationType {
  NIN = 'NIN',
  BVN = 'BVN',
  INTERNATIONAL_PASSPORT = 'INTERNATIONAL_PASSPORT',
  DRIVERS_LICENSE = 'DRIVERS_LICENSE',
  VOTERS_CARD = 'VOTERS_CARD',
  OTHERS = 'OTHERS',
}

@Entity('business_representatives')
export class BusinessRepresentatives extends NonEnvironmentBaseEntity {
  @PrimaryGeneratedColumn('uuid')
  businessRepresentativeId: string;

  @Column({ type: 'uuid' })
  businessId: string;

  @Column({ type: 'varchar' })
  firstName: string;

  @Column({ type: 'varchar' })
  lastName: string;

  @Column({ type: 'varchar', nullable: true })
  middleName: string;

  @Column({ type: 'varchar' })
  email: string;

  @Column({
    type: 'enum',
    enum: VerificationStatus,
    default: VerificationStatus.PENDING,
  })
  verificationStatus: VerificationStatus;

  @Column({ nullable: true })
  rejectionReason: string;

  @Column({ type: 'varchar' })
  phoneNumber: string;

  @Column({
    type: 'varchar',
  })
  role: string;

  @Column({
    type: 'enum',
    enum: IdentificationType,
  })
  identificationType: IdentificationType;

  @Column({ type: 'varchar' })
  identificationNumber: string;

  @Column({ nullable: true })
  identificationDocument: string;

  @Column({ default: false })
  isPrimaryContact: boolean;
}
