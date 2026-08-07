import { MigrationInterface, QueryRunner } from 'typeorm';

export class Banks1785359000000 implements MigrationInterface {
  name = 'Banks1785359000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "banks" (
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        "bankId" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" varchar NOT NULL,
        "bankCode" varchar NOT NULL,
        "countryId" uuid NOT NULL,
        CONSTRAINT "UQ_banks_country_bank_code" UNIQUE ("countryId", "bankCode"),
        CONSTRAINT "PK_banks_bank_id" PRIMARY KEY ("bankId")
      )
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'FK_banks_country_id'
        ) THEN
          ALTER TABLE "banks"
            ADD CONSTRAINT "FK_banks_country_id"
            FOREIGN KEY ("countryId")
            REFERENCES "countries"("countryId")
            ON DELETE CASCADE
            ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "banks"
      DROP CONSTRAINT IF EXISTS "FK_banks_country_id"
    `);
    await queryRunner.query('DROP TABLE IF EXISTS "banks"');
  }
}
