import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProviderBanks1794575719666 implements MigrationInterface {
  name = 'ProviderBanks1794575719666';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "providers" ("createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "providerId" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "serviceType" character varying NOT NULL, "value" character varying NOT NULL, "isActive" boolean NOT NULL DEFAULT false, CONSTRAINT "PK_9a52fe54012f73442a6e852bc5d" PRIMARY KEY ("providerId"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_providers_value_service_type" ON "providers" ("value", "serviceType") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_providers_one_active_per_service" ON "providers" ("serviceType") WHERE "isActive" = true AND "deletedAt" IS NULL`,
    );

    await queryRunner.query(
      `ALTER TABLE "wallet_transactions" ADD "provider" character varying`,
    );
    await queryRunner.query(
      `UPDATE "wallet_transactions" SET "provider" = "metadata"->>'provider' WHERE "provider" IS NULL AND "metadata" ? 'provider'`,
    );
    await queryRunner.query(
      `UPDATE "wallet_transactions" SET "provider" = 'vfd' WHERE "provider" IS NULL AND "source" = 'PAYOUT'`,
    );

    await queryRunner.query(
      `ALTER TABLE "banks" ADD COLUMN IF NOT EXISTS "provider" character varying`,
    );
    await queryRunner.query(
      `UPDATE "banks" SET "provider" = 'vfd' WHERE "provider" IS NULL`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_e608c72b9dbc500479e821b695"`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_a7055563462e88bf37e9bf3988" ON "banks" ("countryId", "bankCode", "provider") `,
    );

    await queryRunner.query(
      `CREATE TABLE "provider_banks" ("createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "providerBankId" uuid NOT NULL DEFAULT uuid_generate_v4(), "bankId" uuid, "provider" character varying NOT NULL, "bankCode" character varying NOT NULL, "name" character varying NOT NULL, CONSTRAINT "PK_9fce058b39f717396ab881f2d28" PRIMARY KEY ("providerBankId"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_provider_banks_provider_code" ON "provider_banks" ("provider", "bankCode") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_provider_banks_provider_bank" ON "provider_banks" ("provider", "bankId") WHERE "bankId" IS NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "provider_banks" ADD CONSTRAINT "FK_78fd4b69d6efa4ea38d0e5b9364" FOREIGN KEY ("bankId") REFERENCES "banks"("bankId") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `INSERT INTO "provider_banks" ("bankId", "provider", "bankCode", "name", "deletedAt") SELECT "bankId", 'vfd', "bankCode", "name", "deletedAt" FROM "banks" WHERE "provider" = 'vfd'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "provider_banks" DROP CONSTRAINT "FK_78fd4b69d6efa4ea38d0e5b9364"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_provider_banks_provider_bank"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_provider_banks_provider_code"`,
    );
    await queryRunner.query(`DROP TABLE "provider_banks"`);

    await queryRunner.query(
      `DROP INDEX "public"."IDX_a7055563462e88bf37e9bf3988"`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_e608c72b9dbc500479e821b695" ON "banks" ("countryId", "bankCode") `,
    );
    await queryRunner.query(`ALTER TABLE "banks" DROP COLUMN "provider"`);

    await queryRunner.query(
      `ALTER TABLE "wallet_transactions" DROP COLUMN "provider"`,
    );

    await queryRunner.query(
      `DROP INDEX "public"."IDX_providers_one_active_per_service"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_providers_value_service_type"`,
    );
    await queryRunner.query(`DROP TABLE "providers"`);
  }
}
