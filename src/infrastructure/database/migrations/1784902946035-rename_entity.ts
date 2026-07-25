import { MigrationInterface, QueryRunner } from "typeorm";

export class RenameEntity1784902946035 implements MigrationInterface {
    name = 'RenameEntity1784902946035'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "dynamic_virtual_accounts" ADD "feeCharged" bigint`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "dynamic_virtual_accounts" DROP COLUMN "feeCharged"`);
    }

}
