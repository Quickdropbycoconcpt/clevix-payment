import { MigrationInterface, QueryRunner } from "typeorm";

export class Doc1786219361216 implements MigrationInterface {
    name = 'Doc1786219361216'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "business_documents" DROP COLUMN "environment"`);
        await queryRunner.query(`ALTER TABLE "business_information" DROP COLUMN "environment"`);
        await queryRunner.query(`ALTER TABLE "business_representatives" DROP COLUMN "environment"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "business_representatives" ADD "environment" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "business_information" ADD "environment" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "business_documents" ADD "environment" character varying NOT NULL`);
    }

}
