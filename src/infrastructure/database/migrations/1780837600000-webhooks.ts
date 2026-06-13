import { MigrationInterface, QueryRunner } from 'typeorm';

export class Webhooks1780837600000 implements MigrationInterface {
  name = 'Webhooks1780837600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "webhooks" (
        "environment" character varying NOT NULL,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        "deleteAt" timestamp,
        "webhookId" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "url" character varying NOT NULL,
        "type" character varying NOT NULL,
        "authType" character varying NOT NULL DEFAULT 'NO_AUTH',
        "secret" character varying,
        "status" character varying NOT NULL DEFAULT 'ACTIVE',
        "businessId" uuid NOT NULL,
        CONSTRAINT "PK_webhooks_webhookId" PRIMARY KEY ("webhookId")
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_webhooks_business_environment_type"
      ON "webhooks" ("businessId", "environment", "type")
      WHERE "deleteAt" IS NULL
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "webhook_snapshots" (
        "environment" character varying NOT NULL,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        "deleteAt" timestamp,
        "snapshotId" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "webhookId" uuid NOT NULL,
        "businessId" uuid NOT NULL,
        "transactionId" uuid,
        "type" character varying NOT NULL,
        "payload" jsonb NOT NULL,
        "responseStatus" integer,
        "responseBody" jsonb,
        "errorMessage" text,
        "deliveryStatus" character varying NOT NULL,
        "attempt" integer NOT NULL DEFAULT '1',
        CONSTRAINT "PK_webhook_snapshots_snapshotId" PRIMARY KEY ("snapshotId")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_webhook_snapshots_webhook_createdAt"
      ON "webhook_snapshots" ("webhookId", "createdAt")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_webhook_snapshots_transaction"
      ON "webhook_snapshots" ("businessId", "environment", "transactionId")
    `);
    await queryRunner.query(`
      ALTER TABLE "webhook_snapshots"
      ADD CONSTRAINT "FK_webhook_snapshots_webhookId"
      FOREIGN KEY ("webhookId") REFERENCES "webhooks"("webhookId")
      ON DELETE NO ACTION ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "webhook_snapshots"
      DROP CONSTRAINT IF EXISTS "FK_webhook_snapshots_webhookId"
    `);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_webhook_snapshots_webhook_createdAt"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_webhook_snapshots_transaction"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "webhook_snapshots"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_webhooks_business_environment_type"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "webhooks"`);
  }
}
