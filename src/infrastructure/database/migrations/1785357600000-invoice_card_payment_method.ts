import { MigrationInterface, QueryRunner } from 'typeorm';

export class InvoiceCardPaymentMethod1785357600000
  implements MigrationInterface
{
  name = 'InvoiceCardPaymentMethod1785357600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."invoice_payment_transactions_method_enum" ADD VALUE IF NOT EXISTS 'CARD'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."invoice_payment_transactions_method_enum_old" AS ENUM('POS', 'TRANSFER')`,
    );
    await queryRunner.query(
      `ALTER TABLE "invoice_payment_transactions" ALTER COLUMN "method" TYPE "public"."invoice_payment_transactions_method_enum_old" USING "method"::"text"::"public"."invoice_payment_transactions_method_enum_old"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."invoice_payment_transactions_method_enum"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."invoice_payment_transactions_method_enum_old" RENAME TO "invoice_payment_transactions_method_enum"`,
    );
  }
}
