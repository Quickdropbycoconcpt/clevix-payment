import { MigrationInterface, QueryRunner } from 'typeorm';

export class TransferStatusCheck1795174576718 implements MigrationInterface {
  name = 'TransferStatusCheck1795174576718';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "wallet_transactions" ADD "nextStatusCheckAt" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "wallet_transactions" ADD "statusCheckAttempts" integer NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "wallet_transactions" ADD "firstNotFoundAt" TIMESTAMP`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_wallet_transactions_status_next_check" ON "wallet_transactions" ("status", "nextStatusCheckAt") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_wallet_transactions_status_next_check"`,
    );
    await queryRunner.query(
      `ALTER TABLE "wallet_transactions" DROP COLUMN "firstNotFoundAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "wallet_transactions" DROP COLUMN "statusCheckAttempts"`,
    );
    await queryRunner.query(
      `ALTER TABLE "wallet_transactions" DROP COLUMN "nextStatusCheckAt"`,
    );
  }
}
