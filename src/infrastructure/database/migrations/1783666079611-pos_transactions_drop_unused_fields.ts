import { MigrationInterface, QueryRunner } from "typeorm";

export class PosTransactionsDropUnusedFields1783666079611 implements MigrationInterface {
    name = 'PosTransactionsDropUnusedFields1783666079611'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "pos_transactions" DROP COLUMN "serialNumber"`);
        await queryRunner.query(`ALTER TABLE "pos_transactions" DROP COLUMN "cardTxnId"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "pos_transactions" ADD "cardTxnId" character varying`);
        await queryRunner.query(`ALTER TABLE "pos_transactions" ADD "serialNumber" character varying`);
    }

}
