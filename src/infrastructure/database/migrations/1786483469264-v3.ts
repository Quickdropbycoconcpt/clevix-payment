import { MigrationInterface, QueryRunner } from "typeorm";

export class V31786483469264 implements MigrationInterface {
    name = 'V31786483469264'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "settlement_transactions" DROP CONSTRAINT "FK_b8714ebae1ce51bc460a95e6009"`);
        await queryRunner.query(`ALTER TABLE "settlement_transactions" ADD "providerbankId" uuid`);
        await queryRunner.query(`ALTER TABLE "settlement_transactions" ADD CONSTRAINT "FK_4a9b852c40848ef27145076750d" FOREIGN KEY ("providerbankId") REFERENCES "SettlementBankAccounts"("bankAccountId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "settlement_transactions" DROP CONSTRAINT "FK_4a9b852c40848ef27145076750d"`);
        await queryRunner.query(`ALTER TABLE "settlement_transactions" DROP COLUMN "providerbankId"`);
        await queryRunner.query(`ALTER TABLE "settlement_transactions" ADD CONSTRAINT "FK_b8714ebae1ce51bc460a95e6009" FOREIGN KEY ("settlementbankAccountId") REFERENCES "SettlementBankAccounts"("bankAccountId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
