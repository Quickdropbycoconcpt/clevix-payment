import { MigrationInterface, QueryRunner } from 'typeorm';

export class Dva21780732992965 implements MigrationInterface {
  name = 'Dva21780732992965';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."dynamic_virtual_accounts_status_enum" AS ENUM('ACTIVE', 'INACTIVE')`,
    );
    await queryRunner.query(
      `ALTER TABLE "dynamic_virtual_accounts" ADD "status" "public"."dynamic_virtual_accounts_status_enum" NOT NULL DEFAULT 'ACTIVE'`,
    );
    await queryRunner.query(
      `ALTER TABLE "dynamic_virtual_accounts" ADD "validityTime" integer NOT NULL DEFAULT '2400'`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_ae3af075ddaf2715c068c2f8d8" ON "dynamic_virtual_accounts"  ("accountNumber", "provider", "status") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ae3af075ddaf2715c068c2f8d8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dynamic_virtual_accounts" DROP COLUMN "validityTime"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dynamic_virtual_accounts" DROP COLUMN "status"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."dynamic_virtual_accounts_status_enum"`,
    );
  }
}
