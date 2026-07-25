import { MigrationInterface, QueryRunner } from "typeorm";

export class SettlementTransactionsTable1784996961737 implements MigrationInterface {
    name = 'SettlementTransactionsTable1784996961737'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."settlement_transactions_paymentsource_enum" AS ENUM('VIRTUAL_ACCOUNT_COLLECTION', 'CLEVIX_WALLET', 'POS_COLLECTION', 'USSD', 'DEBIT_CARD')`);
        await queryRunner.query(`CREATE TYPE "public"."settlement_transactions_settlementtype_enum" AS ENUM('INSTANT', 'T+1')`);
        await queryRunner.query(`CREATE TYPE "public"."settlement_transactions_status_enum" AS ENUM('UNSETTLED', 'SETTLED')`);
        await queryRunner.query(`CREATE TABLE "settlement_transactions" ("businessId" uuid NOT NULL, "environment" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "settlementTransactionsId" uuid NOT NULL DEFAULT uuid_generate_v4(), "paymentSource" "public"."settlement_transactions_paymentsource_enum" NOT NULL, "expectedSettledAmount" bigint NOT NULL, "settlementType" "public"."settlement_transactions_settlementtype_enum" NOT NULL, "settledAmount" bigint NOT NULL DEFAULT '0', "settledAt" TIMESTAMP WITH TIME ZONE, "settlementbankAccountId" integer, "status" "public"."settlement_transactions_status_enum" NOT NULL DEFAULT 'UNSETTLED', CONSTRAINT "PK_222385911e5048ee8d7fb68eb55" PRIMARY KEY ("settlementTransactionsId"))`);
        await queryRunner.query(`ALTER TABLE "settlement_transactions" ADD CONSTRAINT "FK_b8714ebae1ce51bc460a95e6009" FOREIGN KEY ("settlementbankAccountId") REFERENCES "SettlementBankAccounts"("bankAccountId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "settlement_transactions" DROP CONSTRAINT "FK_b8714ebae1ce51bc460a95e6009"`);
        await queryRunner.query(`DROP TABLE "settlement_transactions"`);
        await queryRunner.query(`DROP TYPE "public"."settlement_transactions_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."settlement_transactions_settlementtype_enum"`);
        await queryRunner.query(`DROP TYPE "public"."settlement_transactions_paymentsource_enum"`);
    }

}
