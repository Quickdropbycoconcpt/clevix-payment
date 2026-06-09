import { MigrationInterface, QueryRunner } from "typeorm";

export class Dva31780779520091 implements MigrationInterface {
    name = 'Dva31780779520091'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ledger_accounts" ADD "balance" bigint NOT NULL DEFAULT '0'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ledger_accounts" DROP COLUMN "balance"`);
    }

}
