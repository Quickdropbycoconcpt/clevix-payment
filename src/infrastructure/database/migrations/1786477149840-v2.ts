import { MigrationInterface, QueryRunner } from "typeorm";

export class V21786477149840 implements MigrationInterface {
    name = 'V21786477149840'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."wallet_transactions_environment_enum" AS ENUM('TEST', 'LIVE')`);
        await queryRunner.query(`CREATE TYPE "public"."wallet_transactions_transactiontype_enum" AS ENUM('CREDIT', 'DEBIT')`);
        await queryRunner.query(`CREATE TYPE "public"."wallet_transactions_status_enum" AS ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REVERSED')`);
        await queryRunner.query(`CREATE TYPE "public"."wallet_transactions_source_enum" AS ENUM('COLLECTION', 'SETTLEMENT', 'PAYOUT', 'FEE', 'REVERSAL', 'ADJUSTMENT', 'INTERNAL_TRANSFER')`);
        await queryRunner.query(`CREATE TABLE "wallet_transactions" ("businessId" uuid NOT NULL, "environment" "public"."wallet_transactions_environment_enum" NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "walletTransactionId" uuid NOT NULL DEFAULT uuid_generate_v4(), "walletId" uuid NOT NULL, "reference" character varying NOT NULL, "providerReference" character varying, "transactionType" "public"."wallet_transactions_transactiontype_enum" NOT NULL, "amount" bigint NOT NULL, "availableBalanceBefore" bigint NOT NULL, "availableBalanceAfter" bigint NOT NULL, "currency" character varying NOT NULL, "narration" character varying NOT NULL, "message" text, "status" "public"."wallet_transactions_status_enum" NOT NULL, "source" "public"."wallet_transactions_source_enum" NOT NULL, "sourceId" uuid, "idempotencyKey" character varying, "metadata" jsonb, CONSTRAINT "UQ_4b3d5cb7b4480ca1c3c367ebb45" UNIQUE ("reference"), CONSTRAINT "UQ_b173241cb30e47b8f817160ea74" UNIQUE ("idempotencyKey"), CONSTRAINT "PK_5f625aa5a02ca0388bcd510b557" PRIMARY KEY ("walletTransactionId"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_8e4b9343cf9d4b60cc1f307f21" ON "wallet_transactions"  ("businessId", "environment", "reference") `);
        await queryRunner.query(`CREATE INDEX "IDX_5f90b0972a69334dfc7ff9c8ea" ON "wallet_transactions"  ("walletId", "createdAt") `);
        await queryRunner.query(`ALTER TABLE "wallet_transactions" ADD CONSTRAINT "FK_8a94d9d61a2b05123710b325fbf" FOREIGN KEY ("walletId") REFERENCES "wallets"("walletId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "wallet_transactions" DROP CONSTRAINT "FK_8a94d9d61a2b05123710b325fbf"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_5f90b0972a69334dfc7ff9c8ea"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_8e4b9343cf9d4b60cc1f307f21"`);
        await queryRunner.query(`DROP TABLE "wallet_transactions"`);
        await queryRunner.query(`DROP TYPE "public"."wallet_transactions_source_enum"`);
        await queryRunner.query(`DROP TYPE "public"."wallet_transactions_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."wallet_transactions_transactiontype_enum"`);
        await queryRunner.query(`DROP TYPE "public"."wallet_transactions_environment_enum"`);
    }

}
