import { MigrationInterface, QueryRunner } from "typeorm";

export class Webhook1781261082248 implements MigrationInterface {
    name = 'Webhook1781261082248'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "webhook_snapshots" ("environment" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deleteAt" TIMESTAMP, "snapshotId" uuid NOT NULL DEFAULT uuid_generate_v4(), "webhookId" uuid NOT NULL, "businessId" uuid NOT NULL, "transactionId" uuid, "type" character varying NOT NULL, "payload" jsonb NOT NULL, "responseStatus" integer, "responseBody" jsonb, "errorMessage" text, "deliveryStatus" character varying NOT NULL, "attempt" integer NOT NULL DEFAULT '1', CONSTRAINT "PK_d5ae530de3b29ef1cd78fa5835d" PRIMARY KEY ("snapshotId"))`);
        await queryRunner.query(`CREATE INDEX "IDX_webhook_snapshots_transaction" ON "webhook_snapshots"  ("businessId", "environment", "transactionId") `);
        await queryRunner.query(`CREATE INDEX "IDX_webhook_snapshots_webhook_createdAt" ON "webhook_snapshots"  ("webhookId", "createdAt") `);
        await queryRunner.query(`CREATE TABLE "webhooks" ("environment" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deleteAt" TIMESTAMP, "webhookId" uuid NOT NULL DEFAULT uuid_generate_v4(), "url" character varying NOT NULL, "type" character varying NOT NULL, "authType" character varying NOT NULL DEFAULT 'NO_AUTH', "secret" character varying, "businessId" uuid NOT NULL, CONSTRAINT "PK_b113650895611f034cbb9e63e60" PRIMARY KEY ("webhookId"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_webhooks_business_environment_type" ON "webhooks"  ("businessId", "environment", "type") WHERE "deleteAt" IS NULL`);
        await queryRunner.query(`ALTER TABLE "webhook_snapshots" ADD CONSTRAINT "FK_9253747f6838f918a7594139eda" FOREIGN KEY ("webhookId") REFERENCES "webhooks"("webhookId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "webhook_snapshots" DROP CONSTRAINT "FK_9253747f6838f918a7594139eda"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_webhooks_business_environment_type"`);
        await queryRunner.query(`DROP TABLE "webhooks"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_webhook_snapshots_webhook_createdAt"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_webhook_snapshots_transaction"`);
        await queryRunner.query(`DROP TABLE "webhook_snapshots"`);
    }

}
