import { MigrationInterface, QueryRunner } from "typeorm";

export class Card1785355381180 implements MigrationInterface {
    name = 'Card1785355381180'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."business_documents_verificationstatus_enum" AS ENUM('PENDING', 'VERIFIED', 'REJECTED')`);
        await queryRunner.query(`CREATE TABLE "business_documents" ("businessId" uuid NOT NULL, "environment" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "businessDocumentId" uuid NOT NULL DEFAULT uuid_generate_v4(), "fileUrl" character varying NOT NULL, "verificationStatus" "public"."business_documents_verificationstatus_enum" NOT NULL DEFAULT 'PENDING', "rejectionReason" character varying, "verifiedBy" character varying, "verifiedAt" TIMESTAMP, CONSTRAINT "PK_a73768974e3c03306824d09ac09" PRIMARY KEY ("businessDocumentId"))`);
        await queryRunner.query(`CREATE TYPE "public"."business_information_businesstype_enum" AS ENUM('PRIVATE_COMPANY', 'GOVERNMENT', 'EDUCATIONAL', 'NGO', 'SOLE_PROPRIETOR')`);
        await queryRunner.query(`CREATE TABLE "business_information" ("businessId" uuid NOT NULL, "environment" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "businessInformationId" uuid NOT NULL DEFAULT uuid_generate_v4(), "regNumber" character varying, "addressOne" character varying NOT NULL, "addressTwo" character varying, "businessType" "public"."business_information_businesstype_enum" NOT NULL, "businessPhoneNumber" character varying, "businessEmail" character varying NOT NULL, "stateId" uuid NOT NULL, "lgId" uuid, "city" character varying NOT NULL, CONSTRAINT "PK_879dfe6b55bf7274d78810cc99b" PRIMARY KEY ("businessInformationId"))`);
        await queryRunner.query(`CREATE TYPE "public"."business_representatives_role_enum" AS ENUM('OWNER', 'DIRECTOR', 'CEO', 'CFO', 'FINANCE_MANAGER', 'ADMINISTRATOR', 'ICT_MANAGER', 'AUTHORIZED_SIGNATORY', 'OTHER')`);
        await queryRunner.query(`CREATE TYPE "public"."business_representatives_identificationtype_enum" AS ENUM('NIN', 'BVN', 'INTERNATIONAL_PASSPORT', 'DRIVERS_LICENSE', 'VOTERS_CARD')`);
        await queryRunner.query(`CREATE TABLE "business_representatives" ("businessId" uuid NOT NULL, "environment" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "businessRepresentativeId" SERIAL NOT NULL, "firstName" character varying NOT NULL, "lastName" character varying NOT NULL, "middleName" character varying, "email" character varying NOT NULL, "phoneNumber" character varying NOT NULL, "role" "public"."business_representatives_role_enum" NOT NULL, "identificationType" "public"."business_representatives_identificationtype_enum" NOT NULL, "identificationNumber" character varying NOT NULL, "identificationDocument" character varying, "isPrimaryContact" boolean NOT NULL DEFAULT false, CONSTRAINT "PK_0fa679a6c4c7f115aa0578ff5f1" PRIMARY KEY ("businessRepresentativeId"))`);
        await queryRunner.query(`CREATE TYPE "public"."card_transactions_authorizationtype_enum" AS ENUM('REDIRECT_URL', 'OTP_VALIDATE')`);
        await queryRunner.query(`CREATE TABLE "card_transactions" ("businessId" uuid NOT NULL, "environment" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, "cardTransactionId" uuid NOT NULL DEFAULT uuid_generate_v4(), "amount" bigint NOT NULL, "cardType" character varying, "authorizationType" "public"."card_transactions_authorizationtype_enum", "reference" character varying NOT NULL, CONSTRAINT "UQ_09a916ae33bd32529a17899012d" UNIQUE ("reference"), CONSTRAINT "PK_4bb12110cfc5358041a77539e04" PRIMARY KEY ("cardTransactionId"))`);
        await queryRunner.query(`ALTER TYPE "public"."transactions_source_enum" RENAME TO "transactions_source_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."transactions_source_enum" AS ENUM('COLLECTION_FEE', 'VIRTUAL_ACCOUNT_COLLECTION', 'POS_COLLECTION', 'DEBIT_CARD_COLLECTION', 'TRANSFER', 'BILLS_PAYMENT', 'BILLS_PAYMENT_FEE', 'TRANSFER_FEE', 'STAMP_DUTY', 'CHECKOUT_INVOICE')`);
        await queryRunner.query(`ALTER TABLE "transactions" ALTER COLUMN "source" TYPE "public"."transactions_source_enum" USING "source"::"text"::"public"."transactions_source_enum"`);
        await queryRunner.query(`DROP TYPE "public"."transactions_source_enum_old"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."transactions_source_enum_old" AS ENUM('COLLECTION_FEE', 'VIRTUAL_ACCOUNT_COLLECTION', 'TRANSFER', 'BILLS_PAYMENT', 'BILLS_PAYMENT_FEE', 'TRANSFER_FEE', 'STAMP_DUTY', 'POS_COLLECTION', 'CHECKOUT_INVOICE')`);
        await queryRunner.query(`ALTER TABLE "transactions" ALTER COLUMN "source" TYPE "public"."transactions_source_enum_old" USING "source"::"text"::"public"."transactions_source_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."transactions_source_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."transactions_source_enum_old" RENAME TO "transactions_source_enum"`);
        await queryRunner.query(`DROP TABLE "card_transactions"`);
        await queryRunner.query(`DROP TYPE "public"."card_transactions_authorizationtype_enum"`);
        await queryRunner.query(`DROP TABLE "business_representatives"`);
        await queryRunner.query(`DROP TYPE "public"."business_representatives_identificationtype_enum"`);
        await queryRunner.query(`DROP TYPE "public"."business_representatives_role_enum"`);
        await queryRunner.query(`DROP TABLE "business_information"`);
        await queryRunner.query(`DROP TYPE "public"."business_information_businesstype_enum"`);
        await queryRunner.query(`DROP TABLE "business_documents"`);
        await queryRunner.query(`DROP TYPE "public"."business_documents_verificationstatus_enum"`);
    }

}
