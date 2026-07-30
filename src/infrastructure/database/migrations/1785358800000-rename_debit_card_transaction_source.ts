import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameDebitCardTransactionSource1785358800000
  implements MigrationInterface
{
  name = 'RenameDebitCardTransactionSource1785358800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM pg_enum enum_value
          JOIN pg_type enum_type ON enum_type.oid = enum_value.enumtypid
          JOIN pg_namespace enum_namespace ON enum_namespace.oid = enum_type.typnamespace
          WHERE enum_namespace.nspname = 'public'
            AND enum_type.typname = 'transactions_source_enum'
            AND enum_value.enumlabel = 'DEBIT_COLLECTION'
        ) AND NOT EXISTS (
          SELECT 1
          FROM pg_enum enum_value
          JOIN pg_type enum_type ON enum_type.oid = enum_value.enumtypid
          JOIN pg_namespace enum_namespace ON enum_namespace.oid = enum_type.typnamespace
          WHERE enum_namespace.nspname = 'public'
            AND enum_type.typname = 'transactions_source_enum'
            AND enum_value.enumlabel = 'DEBIT_CARD_COLLECTION'
        ) THEN
          ALTER TYPE "public"."transactions_source_enum"
            RENAME VALUE 'DEBIT_COLLECTION' TO 'DEBIT_CARD_COLLECTION';
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM pg_enum enum_value
          JOIN pg_type enum_type ON enum_type.oid = enum_value.enumtypid
          JOIN pg_namespace enum_namespace ON enum_namespace.oid = enum_type.typnamespace
          WHERE enum_namespace.nspname = 'public'
            AND enum_type.typname = 'transactions_source_enum'
            AND enum_value.enumlabel = 'DEBIT_CARD_COLLECTION'
        ) AND NOT EXISTS (
          SELECT 1
          FROM pg_enum enum_value
          JOIN pg_type enum_type ON enum_type.oid = enum_value.enumtypid
          JOIN pg_namespace enum_namespace ON enum_namespace.oid = enum_type.typnamespace
          WHERE enum_namespace.nspname = 'public'
            AND enum_type.typname = 'transactions_source_enum'
            AND enum_value.enumlabel = 'DEBIT_COLLECTION'
        ) THEN
          ALTER TYPE "public"."transactions_source_enum"
            RENAME VALUE 'DEBIT_CARD_COLLECTION' TO 'DEBIT_COLLECTION';
        END IF;
      END $$;
    `);
  }
}
