import { MigrationInterface, QueryRunner } from "typeorm";

export class V51786538233616 implements MigrationInterface {
    name = 'V51786538233616'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "invoice_payment_transactions" ADD "invoiceTransactionReference" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "invoice_payment_transactions" DROP COLUMN "invoiceTransactionReference"`);
    }

}
