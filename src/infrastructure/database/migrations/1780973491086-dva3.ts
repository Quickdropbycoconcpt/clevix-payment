import { MigrationInterface, QueryRunner } from "typeorm";

export class Dva31780973491086 implements MigrationInterface {
    name = 'Dva31780973491086'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "static_account_wallets" DROP COLUMN "currentTier"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "static_account_wallets" ADD "currentTier" character varying NOT NULL`);
    }

}
