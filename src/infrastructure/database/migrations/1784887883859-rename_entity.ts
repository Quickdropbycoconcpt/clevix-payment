import { MigrationInterface, QueryRunner } from "typeorm";

export class RenameEntity1784887883859 implements MigrationInterface {
    name = 'RenameEntity1784887883859'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "organisation_custom_forms" DROP CONSTRAINT "FK_7221f34a94e468f2b1573b1a0a1"`);
        await queryRunner.query(`ALTER TABLE "organisation_custom_forms" DROP CONSTRAINT "FK_30dfc42a34df05ee1adcd0e67cb"`);
        await queryRunner.query(`ALTER TABLE "organisation_invoices" RENAME COLUMN "fee" TO "merchantReference"`);
        await queryRunner.query(`CREATE TYPE "public"."invoice_payment_transactions_method_enum" AS ENUM('POS', 'TRANSFER')`);
        await queryRunner.query(`CREATE TYPE "public"."invoice_payment_transactions_paymentstatus_enum" AS ENUM('INITIATED', 'PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'EXPIRED', 'CANCELLED')`);
        await queryRunner.query(`CREATE TABLE "invoice_payment_transactions" ("businessId" uuid NOT NULL, "environment" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "invoicePaymentTransactionId" uuid NOT NULL DEFAULT uuid_generate_v4(), "method" "public"."invoice_payment_transactions_method_enum" NOT NULL, "paymentStatus" "public"."invoice_payment_transactions_paymentstatus_enum" NOT NULL DEFAULT 'PENDING', "transactionId" uuid, "invoiceReference" character varying, CONSTRAINT "PK_73993f175db4956d075dc8c070d" PRIMARY KEY ("invoicePaymentTransactionId"))`);
        await queryRunner.query(`CREATE TABLE "service_items" ("businessId" uuid NOT NULL, "environment" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "itemId" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "fixedPrice" boolean NOT NULL DEFAULT false, "fixedAmount" bigint, "settlementAccountId" character varying NOT NULL, "serviceServiceId" uuid, CONSTRAINT "PK_a3bd4de39854b2ba71bd6d11daa" PRIMARY KEY ("itemId"))`);
        await queryRunner.query(`CREATE TABLE "invoice_items" ("businessId" uuid NOT NULL, "environment" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "invoiceItemId" uuid NOT NULL DEFAULT uuid_generate_v4(), "amount" bigint NOT NULL, "invoiceId" uuid NOT NULL, "itemId" uuid NOT NULL, CONSTRAINT "PK_6c077fd4d8a7f65127101d40ff2" PRIMARY KEY ("invoiceItemId"))`);
        await queryRunner.query(`ALTER TABLE "organisation_payment_rules" DROP COLUMN "fixedPrice"`);
        await queryRunner.query(`ALTER TABLE "organisation_payment_rules" DROP COLUMN "fixedAmount"`);
        await queryRunner.query(`ALTER TABLE "organisation_custom_forms" DROP COLUMN "businessId"`);
        await queryRunner.query(`ALTER TABLE "organisation_custom_forms" DROP COLUMN "mandatoryFormId"`);
        await queryRunner.query(`ALTER TABLE "organisation_custom_forms" DROP COLUMN "serviceServiceId"`);
        await queryRunner.query(`ALTER TABLE "organisation_custom_forms" DROP COLUMN "formName"`);
        await queryRunner.query(`ALTER TABLE "organisation_custom_forms" ADD "formKey" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "organisation_custom_forms" ADD "formLabel" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "organisation_custom_forms" ADD "isMandatory" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`CREATE TYPE "public"."organisation_custom_forms_ownertype_enum" AS ENUM('service', 'platform')`);
        await queryRunner.query(`ALTER TABLE "organisation_custom_forms" ADD "ownerType" "public"."organisation_custom_forms_ownertype_enum" NOT NULL`);
        await queryRunner.query(`ALTER TABLE "organisation_custom_forms" ADD "ownerId" uuid`);
        await queryRunner.query(`ALTER TABLE "organization_services" ADD "customerPayForListOfItems" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "organisation_invoices" DROP COLUMN "merchantReference"`);
        await queryRunner.query(`ALTER TABLE "organisation_invoices" ADD "merchantReference" character varying`);
        await queryRunner.query(`ALTER TYPE "public"."transactions_source_enum" ADD VALUE 'CHECKOUT_INVOICE'`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_webhooks_business_environment_type" ON "webhooks"  ("businessId", "environment", "type") WHERE "deletedAt" IS NULL`);
        await queryRunner.query(`ALTER TABLE "organisation_custom_forms" ADD CONSTRAINT "FK_3de229239047decd143f38e757b" FOREIGN KEY ("ownerId") REFERENCES "organization_services"("serviceId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "invoice_payment_transactions" ADD CONSTRAINT "FK_016b8700114cd5e5b74d9dbf13b" FOREIGN KEY ("invoiceReference") REFERENCES "organisation_invoices"("reference") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "service_items" ADD CONSTRAINT "FK_3ab22878adad413258d55e5a619" FOREIGN KEY ("serviceServiceId") REFERENCES "organization_services"("serviceId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "invoice_items" ADD CONSTRAINT "FK_7fb6895fc8fad9f5200e91abb59" FOREIGN KEY ("invoiceId") REFERENCES "organisation_invoices"("invoiceId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "invoice_items" ADD CONSTRAINT "FK_fa3401d21f40e33ebd8b6931040" FOREIGN KEY ("itemId") REFERENCES "service_items"("itemId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "invoice_items" DROP CONSTRAINT "FK_fa3401d21f40e33ebd8b6931040"`);
        await queryRunner.query(`ALTER TABLE "invoice_items" DROP CONSTRAINT "FK_7fb6895fc8fad9f5200e91abb59"`);
        await queryRunner.query(`ALTER TABLE "service_items" DROP CONSTRAINT "FK_3ab22878adad413258d55e5a619"`);
        await queryRunner.query(`ALTER TABLE "invoice_payment_transactions" DROP CONSTRAINT "FK_016b8700114cd5e5b74d9dbf13b"`);
        await queryRunner.query(`ALTER TABLE "organisation_custom_forms" DROP CONSTRAINT "FK_3de229239047decd143f38e757b"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_webhooks_business_environment_type"`);
        await queryRunner.query(`CREATE TYPE "public"."transactions_source_enum_old" AS ENUM('COLLECTION_FEE', 'VIRTUAL_ACCOUNT_COLLECTION', 'TRANSFER', 'BILLS_PAYMENT', 'BILLS_PAYMENT_FEE', 'TRANSFER_FEE', 'STAMP_DUTY', 'POS_COLLECTION')`);
        await queryRunner.query(`ALTER TABLE "transactions" ALTER COLUMN "source" TYPE "public"."transactions_source_enum_old" USING "source"::"text"::"public"."transactions_source_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."transactions_source_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."transactions_source_enum_old" RENAME TO "transactions_source_enum"`);
        await queryRunner.query(`ALTER TABLE "organisation_invoices" DROP COLUMN "merchantReference"`);
        await queryRunner.query(`ALTER TABLE "organisation_invoices" ADD "merchantReference" bigint`);
        await queryRunner.query(`ALTER TABLE "organization_services" DROP COLUMN "customerPayForListOfItems"`);
        await queryRunner.query(`ALTER TABLE "organisation_custom_forms" DROP COLUMN "ownerId"`);
        await queryRunner.query(`ALTER TABLE "organisation_custom_forms" DROP COLUMN "ownerType"`);
        await queryRunner.query(`DROP TYPE "public"."organisation_custom_forms_ownertype_enum"`);
        await queryRunner.query(`ALTER TABLE "organisation_custom_forms" DROP COLUMN "isMandatory"`);
        await queryRunner.query(`ALTER TABLE "organisation_custom_forms" DROP COLUMN "formLabel"`);
        await queryRunner.query(`ALTER TABLE "organisation_custom_forms" DROP COLUMN "formKey"`);
        await queryRunner.query(`ALTER TABLE "organisation_custom_forms" ADD "formName" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "organisation_custom_forms" ADD "serviceServiceId" uuid`);
        await queryRunner.query(`ALTER TABLE "organisation_custom_forms" ADD "mandatoryFormId" uuid`);
        await queryRunner.query(`ALTER TABLE "organisation_custom_forms" ADD "businessId" uuid NOT NULL`);
        await queryRunner.query(`ALTER TABLE "organisation_payment_rules" ADD "fixedAmount" bigint NOT NULL`);
        await queryRunner.query(`ALTER TABLE "organisation_payment_rules" ADD "fixedPrice" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`DROP TABLE "invoice_items"`);
        await queryRunner.query(`DROP TABLE "service_items"`);
        await queryRunner.query(`DROP TABLE "invoice_payment_transactions"`);
        await queryRunner.query(`DROP TYPE "public"."invoice_payment_transactions_paymentstatus_enum"`);
        await queryRunner.query(`DROP TYPE "public"."invoice_payment_transactions_method_enum"`);
        await queryRunner.query(`ALTER TABLE "organisation_invoices" RENAME COLUMN "merchantReference" TO "fee"`);
        await queryRunner.query(`ALTER TABLE "organisation_custom_forms" ADD CONSTRAINT "FK_30dfc42a34df05ee1adcd0e67cb" FOREIGN KEY ("serviceServiceId") REFERENCES "organization_services"("serviceId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "organisation_custom_forms" ADD CONSTRAINT "FK_7221f34a94e468f2b1573b1a0a1" FOREIGN KEY ("mandatoryFormId") REFERENCES "platform_checkout_mandatory_fields"("mandatoryFormId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
