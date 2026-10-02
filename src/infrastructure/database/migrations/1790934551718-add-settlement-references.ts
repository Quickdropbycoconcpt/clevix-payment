import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSettlementReferences1790934551718
  implements MigrationInterface
{
  name = 'AddSettlementReferences1790934551718';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "settlements" ADD "reference" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "settlements" ADD CONSTRAINT "UQ_settlements_reference" UNIQUE ("reference")`,
    );
    await queryRunner.query(
      `ALTER TABLE "settlement_transactions" ADD "reference" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "settlement_transactions" ADD CONSTRAINT "UQ_settlement_transactions_reference" UNIQUE ("reference")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "settlement_transactions" DROP CONSTRAINT "UQ_settlement_transactions_reference"`,
    );
    await queryRunner.query(
      `ALTER TABLE "settlement_transactions" DROP COLUMN "reference"`,
    );
    await queryRunner.query(
      `ALTER TABLE "settlements" DROP CONSTRAINT "UQ_settlements_reference"`,
    );
    await queryRunner.query(`ALTER TABLE "settlements" DROP COLUMN "reference"`);
  }
}
