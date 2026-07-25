import { MigrationInterface, QueryRunner } from "typeorm";

export class DvaPartialUniqueIndex1785012482239 implements MigrationInterface {
    name = 'DvaPartialUniqueIndex1785012482239'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_ae3af075ddaf2715c068c2f8d8"`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_617e40e601e1904cf16d5d91bd" ON "dynamic_virtual_accounts"  ("accountNumber", "provider") WHERE "status" = 'ACTIVE'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_617e40e601e1904cf16d5d91bd"`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_ae3af075ddaf2715c068c2f8d8" ON "dynamic_virtual_accounts" USING btree ("accountNumber", "provider", "status") `);
    }

}
