import { MigrationInterface, QueryRunner } from "typeorm";

export class V81786634165207 implements MigrationInterface {
    name = 'V81786634165207'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."tokens_notificationtype_enum" AS ENUM('EMAIL', 'SMS', 'BOTH')`);
        await queryRunner.query(`ALTER TABLE "tokens" ADD "notificationType" "public"."tokens_notificationtype_enum" NOT NULL`);
        await queryRunner.query(`ALTER TABLE "tokens" ADD "recipientEmail" character varying`);
        await queryRunner.query(`ALTER TABLE "tokens" ADD "recipientPhone" character varying`);
        await queryRunner.query(`ALTER TABLE "tokens" ADD "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tokens" DROP COLUMN "createdAt"`);
        await queryRunner.query(`ALTER TABLE "tokens" DROP COLUMN "recipientPhone"`);
        await queryRunner.query(`ALTER TABLE "tokens" DROP COLUMN "recipientEmail"`);
        await queryRunner.query(`ALTER TABLE "tokens" DROP COLUMN "notificationType"`);
        await queryRunner.query(`DROP TYPE "public"."tokens_notificationtype_enum"`);
    }

}
