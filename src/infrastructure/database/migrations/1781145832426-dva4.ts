import { MigrationInterface, QueryRunner } from "typeorm";

export class Dva41781145832426 implements MigrationInterface {
    name = 'Dva41781145832426'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "collections" ALTER COLUMN "senderBank" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "collections" ALTER COLUMN "bankCode" DROP NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "collections" ALTER COLUMN "bankCode" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "collections" ALTER COLUMN "senderBank" SET NOT NULL`);
    }

}
