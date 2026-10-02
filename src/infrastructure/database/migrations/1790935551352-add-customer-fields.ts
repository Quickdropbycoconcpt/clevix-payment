import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCustomerFields1790935551352 implements MigrationInterface {
  name = 'AddCustomerFields1790935551352';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "transactions" ADD "customerName" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "transactions" ADD "customerEmail" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "dynamic_virtual_accounts" ADD "accountName" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "dynamic_virtual_accounts" ADD "customerEmail" character varying`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "dynamic_virtual_accounts" DROP COLUMN "customerEmail"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dynamic_virtual_accounts" DROP COLUMN "accountName"`,
    );
    await queryRunner.query(
      `ALTER TABLE "transactions" DROP COLUMN "customerEmail"`,
    );
    await queryRunner.query(
      `ALTER TABLE "transactions" DROP COLUMN "customerName"`,
    );
  }
}
