import { MigrationInterface, QueryRunner } from "typeorm";

export class PosTransactions1783211328197 implements MigrationInterface {
    name = 'PosTransactions1783211328197'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."pos_transactions_status_enum" AS ENUM('INITIATED', 'PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'EXPIRED', 'CANCELLED')`);
        await queryRunner.query(`CREATE TABLE "pos_transactions" ("environment" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deleteAt" TIMESTAMP, "posTransactionId" uuid NOT NULL DEFAULT uuid_generate_v4(), "businessId" uuid NOT NULL, "cardTxnId" character varying, "rrn" character varying NOT NULL, "stan" character varying NOT NULL, "amount" bigint NOT NULL, "reference" character varying NOT NULL, "lastFour" character varying, "firstSixDigit" character varying, "status" "public"."pos_transactions_status_enum" NOT NULL, "cardType" character varying, "serialNumber" character varying, "terminalId" character varying, "description" character varying, CONSTRAINT "PK_1ec25bfa4bb0262949123ade8cf" PRIMARY KEY ("posTransactionId"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_fb9d3332a3be515da6b2417475" ON "pos_transactions"  ("rrn") `);
        await queryRunner.query(`CREATE INDEX "IDX_9403c4ac9dc7e4814c28b716ae" ON "pos_transactions"  ("reference") `);
        await queryRunner.query(`ALTER TYPE "public"."transactions_source_enum" ADD VALUE 'POS_COLLECTION'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."transactions_source_enum_old" AS ENUM('COLLECTION_FEE', 'VIRTUAL_ACCOUNT_COLLECTION', 'TRANSFER', 'BILLS_PAYMENT', 'BILLS_PAYMENT_FEE', 'TRANSFER_FEE', 'STAMP_DUTY')`);
        await queryRunner.query(`ALTER TABLE "transactions" ALTER COLUMN "source" TYPE "public"."transactions_source_enum_old" USING "source"::"text"::"public"."transactions_source_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."transactions_source_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."transactions_source_enum_old" RENAME TO "transactions_source_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_9403c4ac9dc7e4814c28b716ae"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_fb9d3332a3be515da6b2417475"`);
        await queryRunner.query(`DROP TABLE "pos_transactions"`);
        await queryRunner.query(`DROP TYPE "public"."pos_transactions_status_enum"`);
    }

}
