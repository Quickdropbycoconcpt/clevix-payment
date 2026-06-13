import { BaseEntity } from 'src/infrastructure/database/base_entiy';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Webhooks } from './webhook.entity';

@Index('IDX_webhook_snapshots_webhook_createdAt', ['webhookId', 'createdAt'])
@Index('IDX_webhook_snapshots_transaction', [
  'businessId',
  'environment',
  'transactionId',
])
@Entity('webhook_snapshots')
export class WebhooksSnapshot extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  snapshotId: string;

  @Column({ type: 'uuid' })
  webhookId: string;

  @Column({ type: 'uuid' })
  businessId: string;

  @Column({ type: 'uuid', nullable: true })
  transactionId: string;

  @Column({ type: 'varchar' })
  type: string;

  @Column({ type: 'jsonb' })
  payload: Record<string, unknown>;

  @Column({ type: 'int', nullable: true })
  responseStatus: number;

  @Column({ type: 'jsonb', nullable: true })
  responseBody: Record<string, unknown> | null;

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @Column({ type: 'varchar' })
  deliveryStatus: string;

  @Column({ type: 'int', default: 1 })
  attempt: number;

  @ManyToOne(() => Webhooks, (webhook) => webhook.snapshots)
  @JoinColumn({ name: 'webhookId' })
  webhook: Webhooks;
}
