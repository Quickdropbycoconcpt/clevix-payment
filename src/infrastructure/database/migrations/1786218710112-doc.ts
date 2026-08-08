import { MigrationInterface, QueryRunner } from "typeorm";

export class Doc1786218710112 implements MigrationInterface {
    name = 'Doc1786218710112'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "banks" DROP CONSTRAINT "FK_banks_country_id"`);
        await queryRunner.query(`ALTER TABLE "banks" DROP CONSTRAINT "UQ_banks_country_bank_code"`);
        await queryRunner.query(`ALTER TABLE "business_documents" DROP COLUMN "fileUrl"`);
        await queryRunner.query(`ALTER TABLE "business_information" DROP COLUMN "stateId"`);
        await queryRunner.query(`ALTER TABLE "business_information" DROP COLUMN "lgId"`);
        await queryRunner.query(`ALTER TABLE "business_information" DROP COLUMN "businessPhoneNumber"`);
        await queryRunner.query(`ALTER TABLE "business_documents" ADD "file" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "business_documents" ADD "documentName" character varying NOT NULL`);
        await queryRunner.query(`CREATE TYPE "public"."business_representatives_verificationstatus_enum" AS ENUM('PENDING', 'VERIFIED', 'REJECTED')`);
        await queryRunner.query(`ALTER TABLE "business_representatives" ADD "verificationStatus" "public"."business_representatives_verificationstatus_enum" NOT NULL DEFAULT 'PENDING'`);
        await queryRunner.query(`ALTER TABLE "business_representatives" ADD "rejectionReason" character varying`);
        await queryRunner.query(`ALTER TABLE "business_information" ADD CONSTRAINT "UQ_39eb4eae73174c9cdbf595b8685" UNIQUE ("businessId")`);
        await queryRunner.query(`ALTER TABLE "business_representatives" DROP CONSTRAINT "PK_0fa679a6c4c7f115aa0578ff5f1"`);
        await queryRunner.query(`ALTER TABLE "business_representatives" DROP COLUMN "businessRepresentativeId"`);
        await queryRunner.query(`ALTER TABLE "business_representatives" ADD "businessRepresentativeId" uuid NOT NULL DEFAULT uuid_generate_v4()`);
        await queryRunner.query(`ALTER TABLE "business_representatives" ADD CONSTRAINT "PK_0fa679a6c4c7f115aa0578ff5f1" PRIMARY KEY ("businessRepresentativeId")`);
        await queryRunner.query(`ALTER TABLE "business_representatives" DROP COLUMN "role"`);
        await queryRunner.query(`DROP TYPE "public"."business_representatives_role_enum"`);
        await queryRunner.query(`ALTER TABLE "business_representatives" ADD "role" character varying NOT NULL`);
        await queryRunner.query(`ALTER TYPE "public"."business_representatives_identificationtype_enum" ADD VALUE 'OTHERS'`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_e608c72b9dbc500479e821b695" ON "banks"  ("countryId", "bankCode") `);
        await queryRunner.query(`ALTER TABLE "businesses" ADD CONSTRAINT "FK_25b614e2a1f6c6f01be617594ba" FOREIGN KEY ("stateId") REFERENCES "states"("stateId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "businesses" ADD CONSTRAINT "FK_7f17de75a462ed63a8180f35fc8" FOREIGN KEY ("lgId") REFERENCES "local_governments"("lgId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "business_information" ADD CONSTRAINT "FK_39eb4eae73174c9cdbf595b8685" FOREIGN KEY ("businessId") REFERENCES "businesses"("businessId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "banks" ADD CONSTRAINT "FK_64c5668b1ffaa284487b81da2d1" FOREIGN KEY ("countryId") REFERENCES "countries"("countryId") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "banks" DROP CONSTRAINT "FK_64c5668b1ffaa284487b81da2d1"`);
        await queryRunner.query(`ALTER TABLE "business_information" DROP CONSTRAINT "FK_39eb4eae73174c9cdbf595b8685"`);
        await queryRunner.query(`ALTER TABLE "businesses" DROP CONSTRAINT "FK_7f17de75a462ed63a8180f35fc8"`);
        await queryRunner.query(`ALTER TABLE "businesses" DROP CONSTRAINT "FK_25b614e2a1f6c6f01be617594ba"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e608c72b9dbc500479e821b695"`);
        await queryRunner.query(`CREATE TYPE "public"."business_representatives_identificationtype_enum_old" AS ENUM('NIN', 'BVN', 'INTERNATIONAL_PASSPORT', 'DRIVERS_LICENSE', 'VOTERS_CARD')`);
        await queryRunner.query(`ALTER TABLE "business_representatives" ALTER COLUMN "identificationType" TYPE "public"."business_representatives_identificationtype_enum_old" USING "identificationType"::"text"::"public"."business_representatives_identificationtype_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."business_representatives_identificationtype_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."business_representatives_identificationtype_enum_old" RENAME TO "business_representatives_identificationtype_enum"`);
        await queryRunner.query(`ALTER TABLE "business_representatives" DROP COLUMN "role"`);
        await queryRunner.query(`CREATE TYPE "public"."business_representatives_role_enum" AS ENUM('OWNER', 'DIRECTOR', 'CEO', 'CFO', 'FINANCE_MANAGER', 'ADMINISTRATOR', 'ICT_MANAGER', 'AUTHORIZED_SIGNATORY', 'OTHER')`);
        await queryRunner.query(`ALTER TABLE "business_representatives" ADD "role" "public"."business_representatives_role_enum" NOT NULL`);
        await queryRunner.query(`ALTER TABLE "business_representatives" DROP CONSTRAINT "PK_0fa679a6c4c7f115aa0578ff5f1"`);
        await queryRunner.query(`ALTER TABLE "business_representatives" DROP COLUMN "businessRepresentativeId"`);
        await queryRunner.query(`ALTER TABLE "business_representatives" ADD "businessRepresentativeId" SERIAL NOT NULL`);
        await queryRunner.query(`ALTER TABLE "business_representatives" ADD CONSTRAINT "PK_0fa679a6c4c7f115aa0578ff5f1" PRIMARY KEY ("businessRepresentativeId")`);
        await queryRunner.query(`ALTER TABLE "business_information" DROP CONSTRAINT "UQ_39eb4eae73174c9cdbf595b8685"`);
        await queryRunner.query(`ALTER TABLE "business_representatives" DROP COLUMN "rejectionReason"`);
        await queryRunner.query(`ALTER TABLE "business_representatives" DROP COLUMN "verificationStatus"`);
        await queryRunner.query(`DROP TYPE "public"."business_representatives_verificationstatus_enum"`);
        await queryRunner.query(`ALTER TABLE "business_documents" DROP COLUMN "documentName"`);
        await queryRunner.query(`ALTER TABLE "business_documents" DROP COLUMN "file"`);
        await queryRunner.query(`ALTER TABLE "business_information" ADD "businessPhoneNumber" character varying`);
        await queryRunner.query(`ALTER TABLE "business_information" ADD "lgId" uuid`);
        await queryRunner.query(`ALTER TABLE "business_information" ADD "stateId" uuid NOT NULL`);
        await queryRunner.query(`ALTER TABLE "business_documents" ADD "fileUrl" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "banks" ADD CONSTRAINT "UQ_banks_country_bank_code" UNIQUE ("bankCode", "countryId")`);
        await queryRunner.query(`ALTER TABLE "banks" ADD CONSTRAINT "FK_banks_country_id" FOREIGN KEY ("countryId") REFERENCES "countries"("countryId") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

}
