import { MigrationInterface, QueryRunner } from 'typeorm';

export class Dva31780777761885 implements MigrationInterface {
  name = 'Dva31780777761885';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_12a06b7faf8dc50c2a7590e603"`,
    );
    await queryRunner.query(
      `ALTER TABLE "ledger_accounts" DROP COLUMN "ownerId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "ledger_accounts" ADD "ownerId" character varying`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_12a06b7faf8dc50c2a7590e603" ON "ledger_accounts"  ("ownerType", "ownerId", "accountType", "currency", "environment") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_12a06b7faf8dc50c2a7590e603"`,
    );
    await queryRunner.query(
      `ALTER TABLE "ledger_accounts" DROP COLUMN "ownerId"`,
    );
    await queryRunner.query(`ALTER TABLE "ledger_accounts" ADD "ownerId" uuid`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_12a06b7faf8dc50c2a7590e603" ON "ledger_accounts" USING btree ("environment", "ownerType", "ownerId", "accountType", "currency") `,
    );
  }
}
