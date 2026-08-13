import { MigrationInterface, QueryRunner } from "typeorm";

export class V61786625860718 implements MigrationInterface {
    name = 'V61786625860718'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."tokens_ownertype_enum" AS ENUM('USER', 'BUSINESS')`);
        await queryRunner.query(`CREATE TABLE "tokens" ("tokenId" uuid NOT NULL DEFAULT uuid_generate_v4(), "ownerType" "public"."tokens_ownertype_enum" NOT NULL, "type" character varying NOT NULL, "tokenHash" character varying NOT NULL, "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL, "usedAt" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_f4940ff249082f72f9877d3b24e" PRIMARY KEY ("tokenId"))`);
        await queryRunner.query(`ALTER TABLE "users" ADD "isEmailVerified" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "users" ADD "isPhoneVerified" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "service_items" ADD "isActive" boolean NOT NULL DEFAULT true`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "service_items" DROP COLUMN "isActive"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "isPhoneVerified"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "isEmailVerified"`);
        await queryRunner.query(`DROP TABLE "tokens"`);
        await queryRunner.query(`DROP TYPE "public"."tokens_ownertype_enum"`);
    }

}
