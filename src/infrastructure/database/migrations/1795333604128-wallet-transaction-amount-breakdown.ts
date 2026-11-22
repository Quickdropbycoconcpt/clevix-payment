import { MigrationInterface, QueryRunner } from 'typeorm';

export class WalletTransactionAmountBreakdown1795333604128 implements MigrationInterface {
  name = 'WalletTransactionAmountBreakdown1795333604128';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "wallet_transactions" ADD "principalAmount" bigint`,
    );
    await queryRunner.query(
      `ALTER TABLE "wallet_transactions" ADD "merchantFee" bigint`,
    );
    await queryRunner.query(
      `ALTER TABLE "wallet_transactions" ADD "providerFee" bigint`,
    );
    await queryRunner.query(
      `UPDATE "wallet_transactions"
       SET "principalAmount" = ("metadata"->>'payoutAmount')::bigint,
           "merchantFee" = ("metadata"->>'merchantFee')::bigint,
           "providerFee" = ("metadata"->>'providerFee')::bigint
       WHERE "source" = 'PAYOUT'
         AND "metadata"->>'payoutAmount' ~ '^[0-9]+$'
         AND "metadata"->>'merchantFee' ~ '^[0-9]+$'
         AND "metadata"->>'providerFee' ~ '^[0-9]+$'
         AND "amount" = ("metadata"->>'payoutAmount')::bigint + ("metadata"->>'merchantFee')::bigint`,
    );
    await queryRunner.query(
      `ALTER TABLE "wallet_transactions" ADD CONSTRAINT "CHK_wallet_transactions_amount_breakdown" CHECK ("principalAmount" IS NULL OR "merchantFee" IS NULL OR "amount" = "principalAmount" + "merchantFee")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "wallet_transactions" DROP CONSTRAINT "CHK_wallet_transactions_amount_breakdown"`,
    );
    await queryRunner.query(
      `ALTER TABLE "wallet_transactions" DROP COLUMN "providerFee"`,
    );
    await queryRunner.query(
      `ALTER TABLE "wallet_transactions" DROP COLUMN "merchantFee"`,
    );
    await queryRunner.query(
      `ALTER TABLE "wallet_transactions" DROP COLUMN "principalAmount"`,
    );
  }
}
