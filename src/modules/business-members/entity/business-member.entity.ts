import { NonEnvironmentBaseEntity } from 'src/infrastructure/database/base_entiy';
import { Businesses } from 'src/modules/businesses/entity/business.entity';
import { User } from 'src/modules/users/entity/user.entity';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BusinessMemberStatus } from '../enums/business-member.enums';
import { BusinessRole } from './business-role.entity';

@Entity('business_members')
@Index(['businessId', 'userId'], { unique: true })
export class BusinessMember extends NonEnvironmentBaseEntity {
  @PrimaryGeneratedColumn('uuid')
  businessMemberId: string;

  @Column({ type: 'uuid' })
  businessId: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'uuid' })
  roleId: string;

  @Column({ type: 'enum', enum: BusinessMemberStatus })
  status: BusinessMemberStatus;

  @Column({ type: 'uuid', nullable: true })
  invitedByUserId: string | null;

  @Column({ type: 'timestamp', nullable: true })
  acceptedAt: Date | null;

  @ManyToOne(() => Businesses, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'businessId' })
  business: Businesses;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => BusinessRole)
  @JoinColumn({ name: 'roleId' })
  role: BusinessRole;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'invitedByUserId' })
  invitedBy: User;
}
