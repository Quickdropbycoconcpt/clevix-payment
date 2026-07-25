import { BaseEntity } from 'src/infrastructure/database/base_entiy';
import { WebhookAuthType } from 'src/shared/enum';
import {
  Column,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { WebhooksSnapshot } from './webhook_snapshot.entity';

@Index(
  'IDX_webhooks_business_environment_type',
  ['businessId', 'environment', 'type'],
  { unique: true, where: '"deletedAt" IS NULL' },
)
@Entity('webhooks')
export class Webhooks extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  webhookId: string;

  @Column({ type: 'varchar' })
  url: string;

  @Column({ type: 'varchar' })
  type: string;

  @Column({ type: 'varchar', default: WebhookAuthType.NO_AUTH })
  authType: WebhookAuthType;

  @Column({ type: 'varchar', nullable: true })
  secret: string;

  @OneToMany(() => WebhooksSnapshot, (snapshot) => snapshot.webhook)
  snapshots: WebhooksSnapshot[];
}
