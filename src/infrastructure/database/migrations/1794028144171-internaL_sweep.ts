import { MigrationInterface, QueryRunner } from "typeorm";

export class InternaLSweep1794028144171 implements MigrationInterface {
    name = 'InternaLSweep1794028144171'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "internal_corporate_accounts" ("internalAccountId" uuid NOT NULL DEFAULT uuid_generate_v4(), "accountNumber" character varying NOT NULL, "provider" character varying NOT NULL, "holdType" character varying NOT NULL, "bankCode" character varying NOT NULL, "isDefault" boolean NOT NULL DEFAULT false, CONSTRAINT "PK_cd486940aa15f51070606e4b4a8" PRIMARY KEY ("internalAccountId"))`);
        await queryRunner.query(`CREATE TYPE "public"."sweep_payment_transactions_type_enum" AS ENUM('PROFIT', 'CHARGES', 'DEPOSIT', 'REFUND', 'WITHDRAWAL')`);
        await queryRunner.query(`CREATE TYPE "public"."sweep_payment_transactions_direction_enum" AS ENUM('CORPORATE_TO_STATIC', 'STATIC_TO_CORPORATE', 'CORPORATE_TO_CORPORATE')`);
        await queryRunner.query(`CREATE TYPE "public"."sweep_payment_transactions_status_enum" AS ENUM('INITIATED', 'PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'EXPIRED', 'CANCELLED')`);
        await queryRunner.query(`CREATE TABLE "sweep_payment_transactions" ("environment" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "sweepTransactionId" uuid NOT NULL DEFAULT uuid_generate_v4(), "businessId" uuid, "staticAccountId" uuid, "reference" character varying NOT NULL, "amount" bigint NOT NULL, "type" "public"."sweep_payment_transactions_type_enum" NOT NULL, "direction" "public"."sweep_payment_transactions_direction_enum" NOT NULL, "fromAccount" character varying NOT NULL, "toAccount" character varying NOT NULL, "status" "public"."sweep_payment_transactions_status_enum" NOT NULL DEFAULT 'INITIATED', "provider" character varying NOT NULL, CONSTRAINT "UQ_10f2b3afa3b640e7daef1c5fd22" UNIQUE ("reference"), CONSTRAINT "PK_f393a01b2fe60932df386e7cab9" PRIMARY KEY ("sweepTransactionId"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "sweep_payment_transactions"`);
        await queryRunner.query(`DROP TYPE "public"."sweep_payment_transactions_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."sweep_payment_transactions_direction_enum"`);
        await queryRunner.query(`DROP TYPE "public"."sweep_payment_transactions_type_enum"`);
        await queryRunner.query(`DROP TABLE "internal_corporate_accounts"`);
    }

}
