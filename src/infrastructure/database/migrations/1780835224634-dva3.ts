import { MigrationInterface, QueryRunner } from "typeorm";

export class Dva31780835224634 implements MigrationInterface {
    name = 'Dva31780835224634'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TYPE "public"."transactions_source_enum" RENAME TO "transactions_source_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."transactions_source_enum" AS ENUM('COLLECTION_FEE', 'VIRTUAL_ACCOUNT_COLLECTION', 'TRANSFER', 'BILLS_PAYMENT', 'BILLS_PAYMENT_FEE', 'TRANSFER_FEE', 'STAMP_DUTY')`);
        await queryRunner.query(`ALTER TABLE "transactions" ALTER COLUMN "source" TYPE "public"."transactions_source_enum" USING "source"::"text"::"public"."transactions_source_enum"`);
        await queryRunner.query(`DROP TYPE "public"."transactions_source_enum_old"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."transactions_source_enum_old" AS ENUM('COLLECTION_FEE', 'COLLECTION', 'TRANSFER', 'BILLS_PAYMENT', 'BILLS_PAYMENT_FEE', 'TRANSFER_FEE', 'STAMP_DUTY')`);
        await queryRunner.query(`ALTER TABLE "transactions" ALTER COLUMN "source" TYPE "public"."transactions_source_enum_old" USING "source"::"text"::"public"."transactions_source_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."transactions_source_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."transactions_source_enum_old" RENAME TO "transactions_source_enum"`);
    }

}
