import { MigrationInterface, QueryRunner } from 'typeorm';

export class CheckMigrationIssue1780600370138 implements MigrationInterface {
  name = 'CheckMigrationIssue1780600370138';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "local_governments" ("createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deleteAt" TIMESTAMP, "lgId" uuid NOT NULL DEFAULT uuid_generate_v4(), "stateId" uuid NOT NULL, "name" character varying NOT NULL, "isActive" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_4addc91b0b927a3e9cad08bff3b" PRIMARY KEY ("lgId"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_5df41035b36fce1e68f1ff5fb4" ON "local_governments"  ("stateId", "name") `,
    );
    await queryRunner.query(
      `CREATE TABLE "states" ("createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deleteAt" TIMESTAMP, "stateId" uuid NOT NULL DEFAULT uuid_generate_v4(), "countryId" uuid NOT NULL, "name" character varying NOT NULL, "code" character varying, "isActive" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_e54e3519e287181c0398c7667ab" PRIMARY KEY ("stateId"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_1e0f02ae40fe2ea4da13b8d460" ON "states"  ("countryId", "name") `,
    );
    await queryRunner.query(
      `CREATE TABLE "countries" ("createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deleteAt" TIMESTAMP, "countryId" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "countryCode" character varying NOT NULL, "phoneCode" character varying, "currency" character varying, "isActive" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_c9ebef6aac022e54b1b01c8f824" PRIMARY KEY ("countryId"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_fa1376321185575cf2226b1491" ON "countries"  ("name") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_2dd5aa96583bb914f7bbdb3e7b" ON "countries"  ("countryCode") `,
    );
    await queryRunner.query(
      `CREATE TABLE "businesses" ("environment" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deleteAt" TIMESTAMP, "businessId" uuid NOT NULL DEFAULT uuid_generate_v4(), "businessIdentifier" character varying NOT NULL, "businessName" character varying NOT NULL, "countryId" uuid NOT NULL, "stateId" uuid, "isActive" boolean NOT NULL DEFAULT false, "lgId" uuid, "businessPhone" character varying NOT NULL, "businessAddress" character varying NOT NULL, CONSTRAINT "PK_76874e4d78318eb5a3af1c21125" PRIMARY KEY ("businessId"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_8ac3ab3b9418ea0499239cdd82" ON "businesses"  ("businessIdentifier") `,
    );
    await queryRunner.query(
      `CREATE TABLE "keys" ("environment" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deleteAt" TIMESTAMP, "keyId" uuid NOT NULL DEFAULT uuid_generate_v4(), "clientId" character varying NOT NULL, "keyHash" character varying NOT NULL, "businessId" character varying NOT NULL, CONSTRAINT "PK_6fb50ee91fbec940b37a887623d" PRIMARY KEY ("keyId"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_18d316d3f20936e7a518d696ff" ON "keys"  ("clientId") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."ledger_transactions_status_enum" AS ENUM('PENDING', 'POSTED', 'REVERSED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "ledger_transactions" ("environment" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deleteAt" TIMESTAMP, "ledgerTransactionId" uuid NOT NULL DEFAULT uuid_generate_v4(), "reference" character varying NOT NULL, "transactionType" character varying NOT NULL, "status" "public"."ledger_transactions_status_enum" NOT NULL, "description" character varying, "metadata" jsonb, CONSTRAINT "PK_9bfb7efcdf2716ed53770e50c0c" PRIMARY KEY ("ledgerTransactionId"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_d87ef09b49fbca993d4370616a" ON "ledger_transactions"  ("reference") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."ledger_entries_direction_enum" AS ENUM('DEBIT', 'CREDIT')`,
    );
    await queryRunner.query(
      `CREATE TABLE "ledger_entries" ("environment" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deleteAt" TIMESTAMP, "ledgerEntryId" uuid NOT NULL DEFAULT uuid_generate_v4(), "ledgerTransactionId" uuid NOT NULL, "ledgerAccountId" uuid NOT NULL, "direction" "public"."ledger_entries_direction_enum" NOT NULL, "amount" bigint NOT NULL, "currency" character varying(3) NOT NULL, "memo" character varying, CONSTRAINT "PK_c2958cfcb7128ff1bc8e32c72ce" PRIMARY KEY ("ledgerEntryId"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_451dcefe42673ec42abb693d33" ON "ledger_entries"  ("ledgerTransactionId", "ledgerAccountId", "direction") `,
    );
    await queryRunner.query(
      `CREATE TABLE "ledger_accounts" ("environment" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deleteAt" TIMESTAMP, "ledgerAccountId" uuid NOT NULL DEFAULT uuid_generate_v4(), "ownerType" character varying NOT NULL, "ownerId" uuid, "accountType" character varying NOT NULL, "currency" character varying(3) NOT NULL, "isActive" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_b72876a2fcf9f430a282484b616" PRIMARY KEY ("ledgerAccountId"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_12a06b7faf8dc50c2a7590e603" ON "ledger_accounts"  ("ownerType", "ownerId", "accountType", "currency", "environment") `,
    );
    await queryRunner.query(
      `CREATE TABLE "users" ("userId" uuid NOT NULL DEFAULT uuid_generate_v4(), "firstName" character varying NOT NULL, "lastName" character varying NOT NULL, "activeBusinessId" character varying, "email" character varying NOT NULL, "phoneNumber" character varying NOT NULL, "dialCode" character varying NOT NULL, "password" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deleteAt" TIMESTAMP, CONSTRAINT "PK_8bf09ba754322ab9c22a215c919" PRIMARY KEY ("userId"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "wallets" ("environment" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deleteAt" TIMESTAMP, "walletId" uuid NOT NULL DEFAULT uuid_generate_v4(), "businessId" uuid NOT NULL, "balance" bigint NOT NULL DEFAULT '0', "currency" character varying NOT NULL, CONSTRAINT "PK_8e246dfcb84930971b5300d8cad" PRIMARY KEY ("walletId"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_0dc7c27ca503fc7cd27baa7304" ON "wallets"  ("businessId", "currency") `,
    );
    await queryRunner.query(
      `ALTER TABLE "local_governments" ADD CONSTRAINT "FK_355cac8ab6d97fe182db5818a84" FOREIGN KEY ("stateId") REFERENCES "states"("stateId") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "states" ADD CONSTRAINT "FK_76ac7edf8f44e80dff569db7321" FOREIGN KEY ("countryId") REFERENCES "countries"("countryId") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "businesses" ADD CONSTRAINT "FK_8b976b1584277b9031082558607" FOREIGN KEY ("countryId") REFERENCES "countries"("countryId") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "ledger_entries" ADD CONSTRAINT "FK_56bda873db7ab15b399b24e3463" FOREIGN KEY ("ledgerTransactionId") REFERENCES "ledger_transactions"("ledgerTransactionId") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "ledger_entries" ADD CONSTRAINT "FK_ab49175bf36bc26d8d1f685b4b3" FOREIGN KEY ("ledgerAccountId") REFERENCES "ledger_accounts"("ledgerAccountId") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "ledger_entries" DROP CONSTRAINT "FK_ab49175bf36bc26d8d1f685b4b3"`,
    );
    await queryRunner.query(
      `ALTER TABLE "ledger_entries" DROP CONSTRAINT "FK_56bda873db7ab15b399b24e3463"`,
    );
    await queryRunner.query(
      `ALTER TABLE "businesses" DROP CONSTRAINT "FK_8b976b1584277b9031082558607"`,
    );
    await queryRunner.query(
      `ALTER TABLE "states" DROP CONSTRAINT "FK_76ac7edf8f44e80dff569db7321"`,
    );
    await queryRunner.query(
      `ALTER TABLE "local_governments" DROP CONSTRAINT "FK_355cac8ab6d97fe182db5818a84"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_0dc7c27ca503fc7cd27baa7304"`,
    );
    await queryRunner.query(`DROP TABLE "wallets"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_12a06b7faf8dc50c2a7590e603"`,
    );
    await queryRunner.query(`DROP TABLE "ledger_accounts"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_451dcefe42673ec42abb693d33"`,
    );
    await queryRunner.query(`DROP TABLE "ledger_entries"`);
    await queryRunner.query(
      `DROP TYPE "public"."ledger_entries_direction_enum"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_d87ef09b49fbca993d4370616a"`,
    );
    await queryRunner.query(`DROP TABLE "ledger_transactions"`);
    await queryRunner.query(
      `DROP TYPE "public"."ledger_transactions_status_enum"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_18d316d3f20936e7a518d696ff"`,
    );
    await queryRunner.query(`DROP TABLE "keys"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_8ac3ab3b9418ea0499239cdd82"`,
    );
    await queryRunner.query(`DROP TABLE "businesses"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_2dd5aa96583bb914f7bbdb3e7b"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_fa1376321185575cf2226b1491"`,
    );
    await queryRunner.query(`DROP TABLE "countries"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_1e0f02ae40fe2ea4da13b8d460"`,
    );
    await queryRunner.query(`DROP TABLE "states"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_5df41035b36fce1e68f1ff5fb4"`,
    );
    await queryRunner.query(`DROP TABLE "local_governments"`);
  }
}
