import { BaseEntity } from 'src/infrastructure/database/base_entiy';
import { Businesses } from 'src/modules/businesses/entity/business.entity';
import { OrganizationType, VerificationStatus } from 'src/shared/enum';
import {
  Column,
  Entity,
  OneToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('business_documents')
export class BusinessDocuments extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  businessDocumentId: string;

  @Column({ type: 'varchar' })
  fileUrl: string;

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
