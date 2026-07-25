import { MigrationInterface, QueryRunner } from "typeorm";

export class RenameEntity1785013473635 implements MigrationInterface {
    name = 'RenameEntity1785013473635'

    public async up(queryRunner: QueryRunner): Promise<void> {
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
    }

}
