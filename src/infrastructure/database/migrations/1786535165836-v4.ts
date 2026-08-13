import { MigrationInterface, QueryRunner } from "typeorm";

export class V41786535165836 implements MigrationInterface {
    name = 'V41786535165836'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "global_platform_features" ("featureId" uuid NOT NULL DEFAULT uuid_generate_v4(), "feature" character varying NOT NULL, "isActive" boolean NOT NULL DEFAULT false, CONSTRAINT "PK_658e326d00fc579a0c9c8819b64" PRIMARY KEY ("featureId"))`);
        await queryRunner.query(`CREATE TYPE "public"."business_allowed_features_environment_enum" AS ENUM('TEST', 'LIVE')`);
        await queryRunner.query(`CREATE TABLE "business_allowed_features" ("businessId" uuid NOT NULL, "environment" "public"."business_allowed_features_environment_enum" NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "businessFeatureId" uuid NOT NULL DEFAULT uuid_generate_v4(), "platformFeatureId" uuid NOT NULL, "isActive" boolean NOT NULL DEFAULT false, CONSTRAINT "PK_0c62bf280d98e09516c659fd81d" PRIMARY KEY ("businessFeatureId"))`);
        await queryRunner.query(`ALTER TABLE "business_allowed_features" ADD CONSTRAINT "FK_f28c214f81e3a25f2362d34a601" FOREIGN KEY ("platformFeatureId") REFERENCES "global_platform_features"("featureId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "business_allowed_features" DROP CONSTRAINT "FK_f28c214f81e3a25f2362d34a601"`);
        await queryRunner.query(`DROP TABLE "business_allowed_features"`);
        await queryRunner.query(`DROP TYPE "public"."business_allowed_features_environment_enum"`);
        await queryRunner.query(`DROP TABLE "global_platform_features"`);
    }

}
