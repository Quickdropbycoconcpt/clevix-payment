import { MigrationInterface, QueryRunner } from "typeorm";

export class PosTransactionsTerminalSerial1783306612912 implements MigrationInterface {
    name = 'PosTransactionsTerminalSerial1783306612912'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "pos_transactions" ADD "terminalSerialNumber" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "pos_transactions" DROP COLUMN "terminalSerialNumber"`);
    }

}
