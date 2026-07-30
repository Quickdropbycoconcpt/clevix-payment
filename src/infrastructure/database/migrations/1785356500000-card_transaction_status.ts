import { MigrationInterface, QueryRunner } from 'typeorm';

export class CardTransactionStatus1785356500000 implements MigrationInterface {
  name = 'CardTransactionStatus1785356500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."card_transactions_status_enum" AS ENUM('INITIATED', 'PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'EXPIRED', 'CANCELLED')`,
    );
    await queryRunner.query(
      `ALTER TABLE "card_transactions" ADD "status" "public"."card_transactions_status_enum" NOT NULL DEFAULT 'INITIATED'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "card_transactions" DROP COLUMN "status"`);
    await queryRunner.query(`DROP TYPE "public"."card_transactions_status_enum"`);
  }
}
