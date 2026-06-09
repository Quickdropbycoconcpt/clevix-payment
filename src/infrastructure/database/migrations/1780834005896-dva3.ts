import { MigrationInterface, QueryRunner } from "typeorm";

export class Dva31780834005896 implements MigrationInterface {
    name = 'Dva31780834005896'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "platform_fee_configuration" DROP COLUMN "providerPercentageFee"`);
        await queryRunner.query(`ALTER TABLE "platform_fee_configuration" ADD "providerPercentageFee" numeric NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "platform_fee_configuration" DROP COLUMN "providerPercentageFeeCap"`);
        await queryRunner.query(`ALTER TABLE "platform_fee_configuration" ADD "providerPercentageFeeCap" numeric NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "platform_fee_configuration" DROP COLUMN "platformPercentageFee"`);
        await queryRunner.query(`ALTER TABLE "platform_fee_configuration" ADD "platformPercentageFee" numeric NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "platform_fee_configuration" DROP COLUMN "PlatformPercentageFeeCap"`);
        await queryRunner.query(`ALTER TABLE "platform_fee_configuration" ADD "PlatformPercentageFeeCap" numeric NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "business_fee_configuration" DROP COLUMN "businessPercentageFee"`);
        await queryRunner.query(`ALTER TABLE "business_fee_configuration" ADD "businessPercentageFee" numeric NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "business_fee_configuration" DROP COLUMN "businessPercentageFeeCap"`);
        await queryRunner.query(`ALTER TABLE "business_fee_configuration" ADD "businessPercentageFeeCap" numeric NOT NULL DEFAULT '0'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "business_fee_configuration" DROP COLUMN "businessPercentageFeeCap"`);
        await queryRunner.query(`ALTER TABLE "business_fee_configuration" ADD "businessPercentageFeeCap" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "business_fee_configuration" DROP COLUMN "businessPercentageFee"`);
        await queryRunner.query(`ALTER TABLE "business_fee_configuration" ADD "businessPercentageFee" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "platform_fee_configuration" DROP COLUMN "PlatformPercentageFeeCap"`);
        await queryRunner.query(`ALTER TABLE "platform_fee_configuration" ADD "PlatformPercentageFeeCap" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "platform_fee_configuration" DROP COLUMN "platformPercentageFee"`);
        await queryRunner.query(`ALTER TABLE "platform_fee_configuration" ADD "platformPercentageFee" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "platform_fee_configuration" DROP COLUMN "providerPercentageFeeCap"`);
        await queryRunner.query(`ALTER TABLE "platform_fee_configuration" ADD "providerPercentageFeeCap" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "platform_fee_configuration" DROP COLUMN "providerPercentageFee"`);
        await queryRunner.query(`ALTER TABLE "platform_fee_configuration" ADD "providerPercentageFee" integer NOT NULL DEFAULT '0'`);
    }

}
