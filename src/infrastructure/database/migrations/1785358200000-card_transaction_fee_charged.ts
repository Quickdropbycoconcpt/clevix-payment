import { MigrationInterface, QueryRunner } from 'typeorm';

export class CardTransactionFeeCharged1785358200000
  implements MigrationInterface
{
  name = 'CardTransactionFeeCharged1785358200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "card_transactions" ADD "feeCharged" bigint`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "card_transactions" DROP COLUMN "feeCharged"`,
    );
  }
}
