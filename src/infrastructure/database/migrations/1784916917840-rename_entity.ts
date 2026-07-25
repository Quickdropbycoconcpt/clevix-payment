import { MigrationInterface, QueryRunner } from "typeorm";

export class RenameEntity1784916917840 implements MigrationInterface {
    name = 'RenameEntity1784916917840'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "organization_services" ADD "isActive" boolean NOT NULL DEFAULT true`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "organization_services" DROP COLUMN "isActive"`);
    }

}
