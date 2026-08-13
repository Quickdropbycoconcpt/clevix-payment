import { MigrationInterface, QueryRunner } from "typeorm";

export class V71786625946521 implements MigrationInterface {
    name = 'V71786625946521'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tokens" ADD "ownerId" uuid NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tokens" DROP COLUMN "ownerId"`);
    }

}
