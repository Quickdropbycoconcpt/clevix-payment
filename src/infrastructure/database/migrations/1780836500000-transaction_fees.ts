import { MigrationInterface, QueryRunner } from 'typeorm';

export class TransactionFees1780836500000 implements MigrationInterface {
  name = 'TransactionFees1780836500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "transaction_fees" (
        "transactionFeeId" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "transactionId" uuid NOT NULL,
        "businessId" uuid NOT NULL,
        "provider" character varying NOT NULL,
        "feeSource" character varying NOT NULL,
        "grossAmount" bigint NOT NULL DEFAULT '0',
        "chargedFee" bigint NOT NULL DEFAULT '0',
        "providerFee" bigint NOT NULL DEFAULT '0',
        "platformRevenue" bigint NOT NULL DEFAULT '0',
        CONSTRAINT "PK_transaction_fees_transactionFeeId" PRIMARY KEY ("transactionFeeId")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "transaction_fees"
      ALTER COLUMN "feeSource" TYPE character varying
      USING "feeSource"::text
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_transaction_fees_transaction_source"
      ON "transaction_fees" ("transactionId", "feeSource")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_transaction_fees_transaction_source"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "transaction_fees"`);
  }
}
