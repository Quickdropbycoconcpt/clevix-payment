import { MigrationInterface, QueryRunner } from "typeorm";

export class Dva31780834218009 implements MigrationInterface {
    name = 'Dva31780834218009'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "platform_fee_configuration" DROP COLUMN "providerFee"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "platform_fee_configuration" ADD "providerFee" integer NOT NULL DEFAULT '0'`);
    }

}
