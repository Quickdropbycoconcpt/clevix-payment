import { NonEnvironmentBaseEntity } from 'src/infrastructure/database/base_entiy';
import { VerificationStatus } from 'src/shared/enum';
import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('business_documents')
@Index(
  'IDX_business_documents_businessId_documentName',
  ['businessId', 'documentName'],
  { unique: true },
)
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
