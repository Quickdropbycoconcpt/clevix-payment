import { MigrationInterface, QueryRunner } from "typeorm";

export class MerchantReferenceUnique1784925433664 implements MigrationInterface {
    name = 'MerchantReferenceUnique1784925433664'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_32365b6733883d0cec79c0938a" ON "organisation_invoices"  ("businessId", "merchantReference") WHERE "merchantReference" IS NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_32365b6733883d0cec79c0938a"`);
    }

}
