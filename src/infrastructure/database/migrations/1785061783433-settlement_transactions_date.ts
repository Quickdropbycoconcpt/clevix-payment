import { MigrationInterface, QueryRunner } from "typeorm";

export class SettlementTransactionsDate1785061783433 implements MigrationInterface {
    name = 'SettlementTransactionsDate1785061783433'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "SettlementBankAccounts" ADD "isPrimary" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "settlement_transactions" ADD "settlementDate" date NOT NULL`);
        await queryRunner.query(`ALTER TABLE "settlement_transactions" DROP CONSTRAINT "FK_b8714ebae1ce51bc460a95e6009"`);
        await queryRunner.query(`ALTER TABLE "SettlementBankAccounts" DROP CONSTRAINT "PK_d2e74e7fee4fce991395cac061c"`);
        await queryRunner.query(`ALTER TABLE "SettlementBankAccounts" DROP COLUMN "bankAccountId"`);
        await queryRunner.query(`ALTER TABLE "SettlementBankAccounts" ADD "bankAccountId" uuid NOT NULL DEFAULT uuid_generate_v4()`);
        await queryRunner.query(`ALTER TABLE "SettlementBankAccounts" ADD CONSTRAINT "PK_d2e74e7fee4fce991395cac061c" PRIMARY KEY ("bankAccountId")`);
        await queryRunner.query(`ALTER TABLE "settlement_transactions" DROP COLUMN "settlementbankAccountId"`);
        await queryRunner.query(`ALTER TABLE "settlement_transactions" ADD "settlementbankAccountId" uuid`);
        await queryRunner.query(`ALTER TABLE "settlement_transactions" ADD CONSTRAINT "FK_b8714ebae1ce51bc460a95e6009" FOREIGN KEY ("settlementbankAccountId") REFERENCES "SettlementBankAccounts"("bankAccountId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "settlement_transactions" DROP CONSTRAINT "FK_b8714ebae1ce51bc460a95e6009"`);
        await queryRunner.query(`ALTER TABLE "settlement_transactions" DROP COLUMN "settlementbankAccountId"`);
        await queryRunner.query(`ALTER TABLE "settlement_transactions" ADD "settlementbankAccountId" integer`);
        await queryRunner.query(`ALTER TABLE "SettlementBankAccounts" DROP CONSTRAINT "PK_d2e74e7fee4fce991395cac061c"`);
        await queryRunner.query(`ALTER TABLE "SettlementBankAccounts" DROP COLUMN "bankAccountId"`);
        await queryRunner.query(`ALTER TABLE "SettlementBankAccounts" ADD "bankAccountId" SERIAL NOT NULL`);
        await queryRunner.query(`ALTER TABLE "SettlementBankAccounts" ADD CONSTRAINT "PK_d2e74e7fee4fce991395cac061c" PRIMARY KEY ("bankAccountId")`);
        await queryRunner.query(`ALTER TABLE "settlement_transactions" ADD CONSTRAINT "FK_b8714ebae1ce51bc460a95e6009" FOREIGN KEY ("settlementbankAccountId") REFERENCES "SettlementBankAccounts"("bankAccountId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "settlement_transactions" DROP COLUMN "settlementDate"`);
        await queryRunner.query(`ALTER TABLE "SettlementBankAccounts" DROP COLUMN "isPrimary"`);
    }

}
