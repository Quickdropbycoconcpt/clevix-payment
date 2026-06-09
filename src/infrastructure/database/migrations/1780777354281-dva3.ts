import { MigrationInterface, QueryRunner } from 'typeorm';

export class Dva31780777354281 implements MigrationInterface {
  name = 'Dva31780777354281';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."transactions_source_enum" AS ENUM('COLLECTION_FEE', 'COLLECTION', 'TRANSFER', 'BILLS_PAYMENT', 'BILLS_PAYMENT_FEE', 'TRANSFER_FEE', 'STAMP_DUTY')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."transactions_executionstatus_enum" AS ENUM('INITIATED', 'PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'EXPIRED', 'CANCELLED')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."transactions_settlementstatus_enum" AS ENUM('UNSETTLED', 'SETTLED', 'REVERSED')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."transactions_riskstatus_enum" AS ENUM('CLEAR', 'HELD', 'DISPUTED')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."transactions_direction_enum" AS ENUM('DEBIT', 'CREDIT')`,
    );
    await queryRunner.query(
      `CREATE TABLE "transactions" ("environment" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deleteAt" TIMESTAMP, "transactionId" uuid NOT NULL DEFAULT uuid_generate_v4(), "businessId" uuid NOT NULL, "expectedAmount" bigint NOT NULL, "settledAmount" bigint NOT NULL, "fee" bigint NOT NULL DEFAULT '0', "source" "public"."transactions_source_enum" NOT NULL, "reference" character varying NOT NULL, "remark" character varying NOT NULL, "sourceId" uuid, "currency" character varying NOT NULL, "provider" character varying NOT NULL, "executionStatus" "public"."transactions_executionstatus_enum" NOT NULL, "merchantReference" character varying, "providerReference" character varying, "settlementStatus" "public"."transactions_settlementstatus_enum", "riskStatus" "public"."transactions_riskstatus_enum", "direction" "public"."transactions_direction_enum" NOT NULL, "failureReason" text, "idempotencyKey" character varying, "metadata" jsonb, CONSTRAINT "UQ_dd85cc865e0c3d5d4be095d3f3f" UNIQUE ("reference"), CONSTRAINT "UQ_86238dd0ae2d79be941104a5842" UNIQUE ("idempotencyKey"), CONSTRAINT "PK_1eb69759461752029252274c105" PRIMARY KEY ("transactionId"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "transactions"`);
    await queryRunner.query(`DROP TYPE "public"."transactions_direction_enum"`);
    await queryRunner.query(
      `DROP TYPE "public"."transactions_riskstatus_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."transactions_settlementstatus_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."transactions_executionstatus_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."transactions_source_enum"`);
  }
}
