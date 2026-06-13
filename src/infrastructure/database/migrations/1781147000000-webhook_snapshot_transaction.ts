import { MigrationInterface, QueryRunner } from 'typeorm';

export class WebhookSnapshotTransaction1781147000000
  implements MigrationInterface
{
  name = 'WebhookSnapshotTransaction1781147000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "webhook_snapshots"
      ADD COLUMN IF NOT EXISTS "transactionId" uuid
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_webhook_snapshots_transaction"
      ON "webhook_snapshots" ("businessId", "environment", "transactionId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_webhook_snapshots_transaction"`,
    );
    await queryRunner.query(`
      ALTER TABLE "webhook_snapshots"
      DROP COLUMN IF EXISTS "transactionId"
    `);
  }
}
