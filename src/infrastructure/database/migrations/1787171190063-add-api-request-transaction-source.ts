import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddApiRequestTransactionSource1787171190063 implements MigrationInterface {
  name = 'AddApiRequestTransactionSource1787171190063';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."transactions_source_enum" ADD VALUE 'API_REQUEST'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."transactions_source_enum_old" AS ENUM('COLLECTION_FEE', 'WALLET_FUNDING', 'TRANSFER', 'BILLS_PAYMENT', 'BILLS_PAYMENT_FEE', 'TRANSFER_FEE', 'STAMP_DUTY', 'CHECKOUT_INVOICE')`,
    );
    await queryRunner.query(
      `ALTER TABLE "transactions" ALTER COLUMN "source" TYPE "public"."transactions_source_enum_old" USING "source"::"text"::"public"."transactions_source_enum_old"`,
    );
    await queryRunner.query(`DROP TYPE "public"."transactions_source_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."transactions_source_enum_old" RENAME TO "transactions_source_enum"`,
    );
  }
}
