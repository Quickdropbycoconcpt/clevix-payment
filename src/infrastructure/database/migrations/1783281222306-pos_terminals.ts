import { MigrationInterface, QueryRunner } from "typeorm";

export class PosTerminals1783281222306 implements MigrationInterface {
    name = 'PosTerminals1783281222306'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."terminals_status_enum" AS ENUM('ACTIVE', 'INACTIVE')`);
        await queryRunner.query(`CREATE TABLE "terminals" ("environment" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deleteAt" TIMESTAMP, "terminalId" uuid NOT NULL DEFAULT uuid_generate_v4(), "businessId" uuid NOT NULL, "serialNumber" character varying NOT NULL, "provider" character varying NOT NULL, "providerTerminalId" character varying, "status" "public"."terminals_status_enum" NOT NULL DEFAULT 'ACTIVE', CONSTRAINT "UQ_22d4b9ab06b235e1e79420cce39" UNIQUE ("providerTerminalId"), CONSTRAINT "PK_e4b9d808ae07e849cc071a5c5b8" PRIMARY KEY ("terminalId"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_6081e1ff1cd417b1941434ab78" ON "terminals"  ("serialNumber") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_6081e1ff1cd417b1941434ab78"`);
        await queryRunner.query(`DROP TABLE "terminals"`);
        await queryRunner.query(`DROP TYPE "public"."terminals_status_enum"`);
    }

}
