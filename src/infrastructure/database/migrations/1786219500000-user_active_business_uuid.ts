import { MigrationInterface, QueryRunner } from 'typeorm';

export class UserActiveBusinessUuid1786219500000
  implements MigrationInterface
{
  name = 'UserActiveBusinessUuid1786219500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ALTER COLUMN "activeBusinessId" TYPE uuid
      USING NULLIF("activeBusinessId", '')::uuid
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ALTER COLUMN "activeBusinessId" TYPE varchar
      USING "activeBusinessId"::varchar
    `);
  }
}
