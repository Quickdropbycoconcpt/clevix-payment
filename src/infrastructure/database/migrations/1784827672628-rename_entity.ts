import { MigrationInterface, QueryRunner } from "typeorm";

export class RenameEntity1784827672628 implements MigrationInterface {
    name = 'RenameEntity1784827672628'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "webhook_snapshots" DROP CONSTRAINT "FK_webhook_snapshots_webhookId"`);
        await queryRunner.query(`ALTER TABLE "local_governments" RENAME COLUMN "deleteAt" TO "deletedAt"`);
        await queryRunner.query(`ALTER TABLE "states" RENAME COLUMN "deleteAt" TO "deletedAt"`);
        await queryRunner.query(`ALTER TABLE "countries" RENAME COLUMN "deleteAt" TO "deletedAt"`);
        await queryRunner.query(`ALTER TABLE "businesses" RENAME COLUMN "deleteAt" TO "deletedAt"`);
        await queryRunner.query(`ALTER TABLE "permissions" RENAME COLUMN "deleteAt" TO "deletedAt"`);
        await queryRunner.query(`ALTER TABLE "business_role_permissions" RENAME COLUMN "deleteAt" TO "deletedAt"`);
        await queryRunner.query(`ALTER TABLE "business_roles" RENAME COLUMN "deleteAt" TO "deletedAt"`);
        await queryRunner.query(`ALTER TABLE "business_members" RENAME COLUMN "deleteAt" TO "deletedAt"`);
        await queryRunner.query(`ALTER TABLE "keys" RENAME COLUMN "deleteAt" TO "deletedAt"`);
        await queryRunner.query(`ALTER TABLE "ledger_transactions" RENAME COLUMN "deleteAt" TO "deletedAt"`);
        await queryRunner.query(`ALTER TABLE "ledger_entries" RENAME COLUMN "deleteAt" TO "deletedAt"`);
        await queryRunner.query(`ALTER TABLE "ledger_accounts" RENAME COLUMN "deleteAt" TO "deletedAt"`);
        await queryRunner.query(`ALTER TABLE "transaction_fees" RENAME COLUMN "deleteAt" TO "deletedAt"`);
        await queryRunner.query(`ALTER TABLE "transactions" RENAME COLUMN "deleteAt" TO "deletedAt"`);
        await queryRunner.query(`ALTER TABLE "wallets" RENAME COLUMN "deleteAt" TO "deletedAt"`);
        await queryRunner.query(`ALTER TABLE "webhook_snapshots" RENAME COLUMN "deleteAt" TO "deletedAt"`);
        await queryRunner.query(`ALTER TABLE "pos_transactions" RENAME COLUMN "deleteAt" TO "deletedAt"`);
        await queryRunner.query(`ALTER TABLE "terminals" RENAME COLUMN "deleteAt" TO "deletedAt"`);
        await queryRunner.query(`ALTER TABLE "dynamic_virtual_accounts" RENAME COLUMN "deleteAt" TO "deletedAt"`);
        await queryRunner.query(`ALTER TABLE "static_account_wallets" RENAME COLUMN "deleteAt" TO "deletedAt"`);
        await queryRunner.query(`CREATE TABLE "organisation_payment_rules" ("businessId" uuid NOT NULL, "environment" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "paymentRuleId" uuid NOT NULL DEFAULT uuid_generate_v4(), "fixedPrice" boolean NOT NULL DEFAULT false, "fixedAmount" bigint NOT NULL, "chargeFee" boolean NOT NULL DEFAULT false, "acceptPartPayment" boolean NOT NULL, "invoiceExpiryMinutes" integer, "currencyCode" character varying NOT NULL, CONSTRAINT "PK_f01d8ffcd9c7229235954f99249" PRIMARY KEY ("paymentRuleId"))`);
        await queryRunner.query(`CREATE TYPE "public"."organisation_invoices_status_enum" AS ENUM('pending', 'paid', 'expired', 'cancelled')`);
        await queryRunner.query(`CREATE TABLE "organisation_invoices" ("businessId" uuid NOT NULL, "environment" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "invoiceId" uuid NOT NULL DEFAULT uuid_generate_v4(), "reference" character varying NOT NULL, "formDetails" jsonb NOT NULL, "amount" bigint NOT NULL, "fee" bigint, "currencyCode" character varying NOT NULL, "status" "public"."organisation_invoices_status_enum" NOT NULL DEFAULT 'pending', "paidAt" TIMESTAMP WITH TIME ZONE, "expiresAt" TIMESTAMP WITH TIME ZONE, "serviceId" uuid NOT NULL, CONSTRAINT "UQ_441baa7b5d7ad01fc55e4878844" UNIQUE ("reference"), CONSTRAINT "PK_5843a89d8a85f76212f83bf51a9" PRIMARY KEY ("invoiceId"))`);
        await queryRunner.query(`CREATE TABLE "organization_services" ("businessId" uuid NOT NULL, "environment" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "serviceId" uuid NOT NULL DEFAULT uuid_generate_v4(), "serviceName" character varying NOT NULL, "apiInitiationOnly" boolean NOT NULL DEFAULT false, "paymentRuleId" uuid, CONSTRAINT "REL_cf970eb883389312269fa0e76e" UNIQUE ("paymentRuleId"), CONSTRAINT "PK_3db01614f39dbe5a2129794c0e3" PRIMARY KEY ("serviceId"))`);
        await queryRunner.query(`CREATE TABLE "organisation_form_options" ("businessId" uuid NOT NULL, "environment" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "optionId" uuid NOT NULL DEFAULT uuid_generate_v4(), "label" character varying NOT NULL, "value" character varying NOT NULL, "sequenceNo" character varying NOT NULL, "customFormFormId" uuid, CONSTRAINT "PK_86f811ae3f9c724fa5bf3460240" PRIMARY KEY ("optionId"))`);
        await queryRunner.query(`CREATE TYPE "public"."organisation_custom_forms_formtype_enum" AS ENUM('text', 'email', 'number', 'tel', 'date', 'checkbox', 'radio', 'select', 'textarea', 'file')`);
        await queryRunner.query(`CREATE TABLE "organisation_custom_forms" ("businessId" uuid NOT NULL, "environment" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "formId" uuid NOT NULL DEFAULT uuid_generate_v4(), "formType" "public"."organisation_custom_forms_formtype_enum" NOT NULL, "formName" character varying NOT NULL, "formLength" character varying NOT NULL, "sequenceNo" character varying NOT NULL, "required" character varying NOT NULL, "mandatoryFormId" uuid, "serviceServiceId" uuid, CONSTRAINT "PK_b380b72fdc12d4a1948596868fb" PRIMARY KEY ("formId"))`);
        await queryRunner.query(`CREATE TABLE "platform_checkout_mandatory_fields" ("businessId" uuid NOT NULL, "environment" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "mandatoryFormId" uuid NOT NULL DEFAULT uuid_generate_v4(), "payerEmail" character varying NOT NULL, "payerFullName" character varying NOT NULL, "phoneNumber" character varying, "amountToPay" bigint NOT NULL, CONSTRAINT "PK_5dcefa2793b1211355ed2aae5bd" PRIMARY KEY ("mandatoryFormId"))`);
        await queryRunner.query(`ALTER TABLE "webhooks" DROP COLUMN "deleteAt"`);
        await queryRunner.query(`ALTER TABLE "webhooks" DROP COLUMN "status"`);
        await queryRunner.query(`ALTER TABLE "collections" DROP COLUMN "deleteAt"`);
        await queryRunner.query(`ALTER TABLE "webhooks" ADD "deletedAt" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "collections" ADD "businessId" uuid NOT NULL`);
        await queryRunner.query(`ALTER TABLE "collections" ADD "deletedAt" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "organisation_invoices" ADD CONSTRAINT "FK_4f5103b10444f29651fcb56695e" FOREIGN KEY ("serviceId") REFERENCES "organization_services"("serviceId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "organization_services" ADD CONSTRAINT "FK_cf970eb883389312269fa0e76e7" FOREIGN KEY ("paymentRuleId") REFERENCES "organisation_payment_rules"("paymentRuleId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "organisation_form_options" ADD CONSTRAINT "FK_02a04d365c0ff965344c8995d94" FOREIGN KEY ("customFormFormId") REFERENCES "organisation_custom_forms"("formId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "organisation_custom_forms" ADD CONSTRAINT "FK_7221f34a94e468f2b1573b1a0a1" FOREIGN KEY ("mandatoryFormId") REFERENCES "platform_checkout_mandatory_fields"("mandatoryFormId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "organisation_custom_forms" ADD CONSTRAINT "FK_30dfc42a34df05ee1adcd0e67cb" FOREIGN KEY ("serviceServiceId") REFERENCES "organization_services"("serviceId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "webhook_snapshots" ADD CONSTRAINT "FK_9253747f6838f918a7594139eda" FOREIGN KEY ("webhookId") REFERENCES "webhooks"("webhookId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "webhook_snapshots" DROP CONSTRAINT "FK_9253747f6838f918a7594139eda"`);
        await queryRunner.query(`ALTER TABLE "organisation_custom_forms" DROP CONSTRAINT "FK_30dfc42a34df05ee1adcd0e67cb"`);
        await queryRunner.query(`ALTER TABLE "organisation_custom_forms" DROP CONSTRAINT "FK_7221f34a94e468f2b1573b1a0a1"`);
        await queryRunner.query(`ALTER TABLE "organisation_form_options" DROP CONSTRAINT "FK_02a04d365c0ff965344c8995d94"`);
        await queryRunner.query(`ALTER TABLE "organization_services" DROP CONSTRAINT "FK_cf970eb883389312269fa0e76e7"`);
        await queryRunner.query(`ALTER TABLE "organisation_invoices" DROP CONSTRAINT "FK_4f5103b10444f29651fcb56695e"`);
        await queryRunner.query(`ALTER TABLE "collections" DROP COLUMN "deletedAt"`);
        await queryRunner.query(`ALTER TABLE "collections" DROP COLUMN "businessId"`);
        await queryRunner.query(`ALTER TABLE "webhooks" DROP COLUMN "deletedAt"`);
        await queryRunner.query(`ALTER TABLE "collections" ADD "deleteAt" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "webhooks" ADD "status" character varying NOT NULL DEFAULT 'ACTIVE'`);
        await queryRunner.query(`ALTER TABLE "webhooks" ADD "deleteAt" TIMESTAMP`);
        await queryRunner.query(`DROP TABLE "platform_checkout_mandatory_fields"`);
        await queryRunner.query(`DROP TABLE "organisation_custom_forms"`);
        await queryRunner.query(`DROP TYPE "public"."organisation_custom_forms_formtype_enum"`);
        await queryRunner.query(`DROP TABLE "organisation_form_options"`);
        await queryRunner.query(`DROP TABLE "organization_services"`);
        await queryRunner.query(`DROP TABLE "organisation_invoices"`);
        await queryRunner.query(`DROP TYPE "public"."organisation_invoices_status_enum"`);
        await queryRunner.query(`DROP TABLE "organisation_payment_rules"`);
        await queryRunner.query(`ALTER TABLE "static_account_wallets" RENAME COLUMN "deletedAt" TO "deleteAt"`);
        await queryRunner.query(`ALTER TABLE "dynamic_virtual_accounts" RENAME COLUMN "deletedAt" TO "deleteAt"`);
        await queryRunner.query(`ALTER TABLE "terminals" RENAME COLUMN "deletedAt" TO "deleteAt"`);
        await queryRunner.query(`ALTER TABLE "pos_transactions" RENAME COLUMN "deletedAt" TO "deleteAt"`);
        await queryRunner.query(`ALTER TABLE "webhook_snapshots" RENAME COLUMN "deletedAt" TO "deleteAt"`);
        await queryRunner.query(`ALTER TABLE "wallets" RENAME COLUMN "deletedAt" TO "deleteAt"`);
        await queryRunner.query(`ALTER TABLE "transactions" RENAME COLUMN "deletedAt" TO "deleteAt"`);
        await queryRunner.query(`ALTER TABLE "transaction_fees" RENAME COLUMN "deletedAt" TO "deleteAt"`);
        await queryRunner.query(`ALTER TABLE "ledger_accounts" RENAME COLUMN "deletedAt" TO "deleteAt"`);
        await queryRunner.query(`ALTER TABLE "ledger_entries" RENAME COLUMN "deletedAt" TO "deleteAt"`);
        await queryRunner.query(`ALTER TABLE "ledger_transactions" RENAME COLUMN "deletedAt" TO "deleteAt"`);
        await queryRunner.query(`ALTER TABLE "keys" RENAME COLUMN "deletedAt" TO "deleteAt"`);
        await queryRunner.query(`ALTER TABLE "business_members" RENAME COLUMN "deletedAt" TO "deleteAt"`);
        await queryRunner.query(`ALTER TABLE "business_roles" RENAME COLUMN "deletedAt" TO "deleteAt"`);
        await queryRunner.query(`ALTER TABLE "business_role_permissions" RENAME COLUMN "deletedAt" TO "deleteAt"`);
        await queryRunner.query(`ALTER TABLE "permissions" RENAME COLUMN "deletedAt" TO "deleteAt"`);
        await queryRunner.query(`ALTER TABLE "businesses" RENAME COLUMN "deletedAt" TO "deleteAt"`);
        await queryRunner.query(`ALTER TABLE "countries" RENAME COLUMN "deletedAt" TO "deleteAt"`);
        await queryRunner.query(`ALTER TABLE "states" RENAME COLUMN "deletedAt" TO "deleteAt"`);
        await queryRunner.query(`ALTER TABLE "local_governments" RENAME COLUMN "deletedAt" TO "deleteAt"`);
        await queryRunner.query(`ALTER TABLE "webhook_snapshots" ADD CONSTRAINT "FK_webhook_snapshots_webhookId" FOREIGN KEY ("webhookId") REFERENCES "webhooks"("webhookId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
