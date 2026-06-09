import { MigrationInterface, QueryRunner } from "typeorm";

export class Dva31780973176806 implements MigrationInterface {
    name = 'Dva31780973176806'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."static_account_wallets_accounttype_enum" AS ENUM('INDIVIDUAL', 'CORPORATE')`);
        await queryRunner.query(`CREATE TABLE "static_account_wallets" ("environment" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deleteAt" TIMESTAMP, "walletAccountId" uuid NOT NULL DEFAULT uuid_generate_v4(), "accountNumber" character varying NOT NULL, "accountName" character varying NOT NULL, "accountType" "public"."static_account_wallets_accounttype_enum" NOT NULL, "currentTier" character varying NOT NULL, "provider" character varying NOT NULL, "businessId" uuid NOT NULL, "address" character varying, "bvn" character varying, "nin" character varying, "rcNumber" character varying, CONSTRAINT "PK_8f171e18f09697b2602a51cede1" PRIMARY KEY ("walletAccountId"))`);
        await queryRunner.query(`ALTER TABLE "static_account_wallets" ADD CONSTRAINT "FK_4e6450ae7bae9cdd3375b96c947" FOREIGN KEY ("businessId") REFERENCES "businesses"("businessId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "static_account_wallets" DROP CONSTRAINT "FK_4e6450ae7bae9cdd3375b96c947"`);
        await queryRunner.query(`DROP TABLE "static_account_wallets"`);
        await queryRunner.query(`DROP TYPE "public"."static_account_wallets_accounttype_enum"`);
    }

}
