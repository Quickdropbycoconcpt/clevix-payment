import { NonEnvironmentBaseEntity } from 'src/infrastructure/database/base_entiy';
import { VerificationStatus } from 'src/shared/enum';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('business_documents')
export class BusinessDocuments extends NonEnvironmentBaseEntity {
  @PrimaryGeneratedColumn('uuid')
  businessDocumentId: string;

  @Column({ type: 'varchar' })
  file: string;

  @Column({ type: 'uuid' })
  businessId: string;

  @Column({ type: 'varchar' })
  documentName: string;

  @Column({
    type: 'enum',
    enum: VerificationStatus,
    default: VerificationStatus.PENDING,
  })
  verificationStatus: VerificationStatus;

  @Column({ nullable: true })
  rejectionReason: string;

  @Column({ nullable: true })
  verifiedBy: string;

  @Column({ type: 'timestamp', nullable: true })
  verifiedAt: Date;
}
