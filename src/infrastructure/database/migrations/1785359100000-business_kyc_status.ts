import { MigrationInterface, QueryRunner } from 'typeorm';

export class BusinessKycStatus1785359100000 implements MigrationInterface {
  name = 'BusinessKycStatus1785359100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_type enum_type
          JOIN pg_namespace enum_namespace ON enum_namespace.oid = enum_type.typnamespace
          WHERE enum_namespace.nspname = 'public'
            AND enum_type.typname = 'businesses_kycstatus_enum'
        ) THEN
          CREATE TYPE "public"."businesses_kycstatus_enum"
            AS ENUM('APPROVED', 'IN_REVIEW', 'REJECTED', 'PENDING');
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      ALTER TABLE "businesses"
      ADD COLUMN IF NOT EXISTS "kycStatus" "public"."businesses_kycstatus_enum"
      NOT NULL DEFAULT 'PENDING'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "businesses"
      DROP COLUMN IF EXISTS "kycStatus"
    `);
    await queryRunner.query(`
      DROP TYPE IF EXISTS "public"."businesses_kycstatus_enum"
    `);
  }
}
