import { MigrationInterface, QueryRunner } from "typeorm";

export class Dva31780855025075 implements MigrationInterface {
    name = 'Dva31780855025075'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "transaction_fees" ADD "createdAt" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "transaction_fees" ADD "updatedAt" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "transaction_fees" ADD "deleteAt" TIMESTAMP`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "transaction_fees" DROP COLUMN "deleteAt"`);
        await queryRunner.query(`ALTER TABLE "transaction_fees" DROP COLUMN "updatedAt"`);
        await queryRunner.query(`ALTER TABLE "transaction_fees" DROP COLUMN "createdAt"`);
    }

}
