import { ActionOwner, TokenNotificationType, TokenType } from 'src/shared/enum';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('tokens')
export class Token {
  @PrimaryGeneratedColumn('uuid')
  tokenId: string;

  @Column({ enum: ActionOwner, type: 'enum' })
  ownerType: ActionOwner;

  @Column({ type: 'uuid' })
  ownerId: string;

  @Column({ type: 'varchar' })
  type: TokenType;

  @Column({ type: 'varchar' })
  tokenHash: string;

  @Column({ enum: TokenNotificationType, type: 'enum' })
  notificationType: TokenNotificationType;

  @Column({ type: 'varchar', nullable: true })
  recipientEmail?: string | null;

  @Column({ type: 'varchar', nullable: true })
  recipientPhone?: string | null;

  @Column({ type: 'timestamptz' })
  expiresAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  usedAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
