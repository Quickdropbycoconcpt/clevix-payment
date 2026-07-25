import { MigrationInterface, QueryRunner } from "typeorm";

export class RenameEntity1784916401868 implements MigrationInterface {
    name = 'RenameEntity1784916401868'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."organisation_invoices_redemptionstatus_enum" AS ENUM('NOT_USED', 'REDEEMED')`);
        await queryRunner.query(`ALTER TABLE "organisation_invoices" ADD "redemptionStatus" "public"."organisation_invoices_redemptionstatus_enum"`);
        await queryRunner.query(`ALTER TABLE "organisation_invoices" ADD "redeemedAt" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "organisation_invoices" ADD "redeemedBy" uuid`);
        await queryRunner.query(`ALTER TABLE "organization_services" ADD "requiredRedemption" boolean NOT NULL DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "organization_services" DROP COLUMN "requiredRedemption"`);
        await queryRunner.query(`ALTER TABLE "organisation_invoices" DROP COLUMN "redeemedBy"`);
        await queryRunner.query(`ALTER TABLE "organisation_invoices" DROP COLUMN "redeemedAt"`);
        await queryRunner.query(`ALTER TABLE "organisation_invoices" DROP COLUMN "redemptionStatus"`);
        await queryRunner.query(`DROP TYPE "public"."organisation_invoices_redemptionstatus_enum"`);
    }

}
