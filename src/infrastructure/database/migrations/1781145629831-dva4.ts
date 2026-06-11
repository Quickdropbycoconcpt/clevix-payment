import { MigrationInterface, QueryRunner } from "typeorm";

export class Dva41781145629831 implements MigrationInterface {
    name = 'Dva41781145629831'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."collections_source_enum" AS ENUM('POS', 'DEBIT_MANDATES', 'VIRTUAL_ACCOUNT', 'CARD')`);
        await queryRunner.query(`CREATE TYPE "public"."collections_status_enum" AS ENUM('INITIATED', 'PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'EXPIRED', 'CANCELLED')`);
        await queryRunner.query(`CREATE TABLE "collections" ("environment" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deleteAt" TIMESTAMP, "collectionId" uuid NOT NULL DEFAULT uuid_generate_v4(), "senderBank" character varying NOT NULL, "bankCode" character varying NOT NULL, "currency" character varying NOT NULL, "amount" bigint NOT NULL, "source" "public"."collections_source_enum" NOT NULL, "reference" character varying NOT NULL, "provider" character varying NOT NULL, "status" "public"."collections_status_enum" NOT NULL, "transactionId" character varying, "sessionId" character varying, "metadata" jsonb, CONSTRAINT "PK_439ce999fe0130001a2015c3eb1" PRIMARY KEY ("collectionId"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_f2acf3e2a223189eddd4bccc91" ON "collections"  ("reference") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_f2acf3e2a223189eddd4bccc91"`);
        await queryRunner.query(`DROP TABLE "collections"`);
        await queryRunner.query(`DROP TYPE "public"."collections_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."collections_source_enum"`);
    }

}
