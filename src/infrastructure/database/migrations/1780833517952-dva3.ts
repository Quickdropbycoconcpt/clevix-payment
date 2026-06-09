import { MigrationInterface, QueryRunner } from "typeorm";

export class Dva31780833517952 implements MigrationInterface {
    name = 'Dva31780833517952'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "platform_fee_configuration" ("platformFeeId" uuid NOT NULL DEFAULT uuid_generate_v4(), "providerFee" integer NOT NULL DEFAULT '0', "provider" character varying NOT NULL, "providerPercentageFee" integer NOT NULL DEFAULT '0', "providerPercentageFeeCap" integer NOT NULL DEFAULT '0', "platformPercentageFee" integer NOT NULL DEFAULT '0', "PlatformPercentageFeeCap" integer NOT NULL DEFAULT '0', "providerflatFee" integer NOT NULL DEFAULT '0', "platformflatFee" integer NOT NULL DEFAULT '0', "useFlatFee" boolean NOT NULL DEFAULT false, "feeSource" character varying NOT NULL, CONSTRAINT "PK_c1e4eff84d4d7a1a48c1fc67aa8" PRIMARY KEY ("platformFeeId"))`);
        await queryRunner.query(`CREATE TABLE "business_fee_configuration" ("businessFeeId" uuid NOT NULL DEFAULT uuid_generate_v4(), "businessId" uuid NOT NULL, "platformFeeId" uuid NOT NULL, "businessPercentageFee" integer NOT NULL DEFAULT '0', "businessPercentageFeeCap" integer NOT NULL DEFAULT '0', "businessFeeFlat" integer NOT NULL DEFAULT '0', "useFlatFee" boolean NOT NULL DEFAULT false, CONSTRAINT "PK_29677ffdec718e892d09ee99ad3" PRIMARY KEY ("businessFeeId"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_6b33ba5b78af59608a0877f829" ON "business_fee_configuration"  ("businessId", "platformFeeId") `);
        await queryRunner.query(`ALTER TABLE "business_fee_configuration" ADD CONSTRAINT "FK_23398b21aac00b0cb956744d104" FOREIGN KEY ("platformFeeId") REFERENCES "platform_fee_configuration"("platformFeeId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "business_fee_configuration" DROP CONSTRAINT "FK_23398b21aac00b0cb956744d104"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_6b33ba5b78af59608a0877f829"`);
        await queryRunner.query(`DROP TABLE "business_fee_configuration"`);
        await queryRunner.query(`DROP TABLE "platform_fee_configuration"`);
    }

}
