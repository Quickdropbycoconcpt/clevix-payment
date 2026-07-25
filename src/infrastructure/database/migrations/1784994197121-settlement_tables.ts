import { MigrationInterface, QueryRunner } from "typeorm";

export class SettlementTables1784994197121 implements MigrationInterface {
    name = 'SettlementTables1784994197121'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."business_settlement_configs_settlementlocation_enum" AS ENUM('WALLET', 'BANK')`);
        await queryRunner.query(`CREATE TYPE "public"."business_settlement_configs_paymentsource_enum" AS ENUM('VIRTUAL_ACCOUNT_COLLECTION', 'CLEVIX_WALLET', 'POS_COLLECTION', 'USSD', 'DEBIT_CARD')`);
        await queryRunner.query(`CREATE TYPE "public"."business_settlement_configs_settlementtype_enum" AS ENUM('INSTANT', 'T+1')`);
        await queryRunner.query(`CREATE TABLE "business_settlement_configs" ("businessId" uuid NOT NULL, "environment" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "businessSettelementConfig" uuid NOT NULL DEFAULT uuid_generate_v4(), "settlementLocation" "public"."business_settlement_configs_settlementlocation_enum" NOT NULL, "paymentSource" "public"."business_settlement_configs_paymentsource_enum" NOT NULL, "settlementType" "public"."business_settlement_configs_settlementtype_enum" NOT NULL, CONSTRAINT "CHK_568ff5d5efb2b5a0dd76a10e86" CHECK ("settlementType" != 'INSTANT' OR "settlementLocation" = 'WALLET'), CONSTRAINT "PK_0f46b1253101568981f4704a73b" PRIMARY KEY ("businessSettelementConfig"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_5e2ba1a7e2a123c0382ff596ba" ON "business_settlement_configs"  ("businessId", "paymentSource") `);
        await queryRunner.query(`CREATE TABLE "SettlementBankAccounts" ("businessId" uuid NOT NULL, "environment" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "bankAccountId" SERIAL NOT NULL, "accountNumber" character varying NOT NULL, "accountName" character varying NOT NULL, "providerbankId" character varying NOT NULL, CONSTRAINT "PK_d2e74e7fee4fce991395cac061c" PRIMARY KEY ("bankAccountId"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "SettlementBankAccounts"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_5e2ba1a7e2a123c0382ff596ba"`);
        await queryRunner.query(`DROP TABLE "business_settlement_configs"`);
        await queryRunner.query(`DROP TYPE "public"."business_settlement_configs_settlementtype_enum"`);
        await queryRunner.query(`DROP TYPE "public"."business_settlement_configs_paymentsource_enum"`);
        await queryRunner.query(`DROP TYPE "public"."business_settlement_configs_settlementlocation_enum"`);
    }

}
