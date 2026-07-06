import { MigrationInterface, QueryRunner } from "typeorm";

export class PosTransactionsMerchantContext1783241454049 implements MigrationInterface {
    name = 'PosTransactionsMerchantContext1783241454049'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "pos_transactions" ADD "merchantIdentifier" character varying`);
        await queryRunner.query(`CREATE TYPE "public"."pos_transactions_purpose_enum" AS ENUM('WALLET_FUNDING', 'PURCHASE')`);
        await queryRunner.query(`ALTER TABLE "pos_transactions" ADD "purpose" "public"."pos_transactions_purpose_enum"`);
        await queryRunner.query(`ALTER TABLE "pos_transactions" ADD "accountOrItemId" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "pos_transactions" DROP COLUMN "accountOrItemId"`);
        await queryRunner.query(`ALTER TABLE "pos_transactions" DROP COLUMN "purpose"`);
        await queryRunner.query(`DROP TYPE "public"."pos_transactions_purpose_enum"`);
        await queryRunner.query(`ALTER TABLE "pos_transactions" DROP COLUMN "merchantIdentifier"`);
    }

}
