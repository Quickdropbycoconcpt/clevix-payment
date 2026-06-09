import { MigrationInterface, QueryRunner } from 'typeorm';

export class AS1780691932217 implements MigrationInterface {
  name = 'AS1780691932217';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "dynamic_virtual_accounts" ("environment" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deleteAt" TIMESTAMP, "dvaId" uuid NOT NULL DEFAULT uuid_generate_v4(), "businessId" uuid NOT NULL, "accountNumber" character varying NOT NULL, "provider" character varying NOT NULL, "merchantReference" character varying(100) NOT NULL, "reference" character varying NOT NULL, CONSTRAINT "PK_b6884613a036dfed7ea97157867" PRIMARY KEY ("dvaId"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_9cc2161923f9d2590c64d7b8de" ON "dynamic_virtual_accounts"  ("merchantReference") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_84bf568e6035977b73568003bc" ON "dynamic_virtual_accounts"  ("reference") `,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_017943867ed5ceef9c03edd974"`,
    );
    await queryRunner.query(`ALTER TABLE "permissions" DROP COLUMN "key"`);
    await queryRunner.query(`DROP TYPE "public"."permissions_key_enum"`);
    await queryRunner.query(
      `ALTER TABLE "permissions" ADD "key" character varying NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "keys" DROP COLUMN "businessId"`);
    await queryRunner.query(
      `ALTER TABLE "keys" ADD "businessId" uuid NOT NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_017943867ed5ceef9c03edd974" ON "permissions"  ("key") `,
    );
    await queryRunner.query(
      `ALTER TABLE "keys" ADD CONSTRAINT "FK_660d9a956a31f083fe80b189837" FOREIGN KEY ("businessId") REFERENCES "businesses"("businessId") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "keys" DROP CONSTRAINT "FK_660d9a956a31f083fe80b189837"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_017943867ed5ceef9c03edd974"`,
    );
    await queryRunner.query(`ALTER TABLE "keys" DROP COLUMN "businessId"`);
    await queryRunner.query(
      `ALTER TABLE "keys" ADD "businessId" character varying NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "permissions" DROP COLUMN "key"`);
    await queryRunner.query(
      `CREATE TYPE "public"."permissions_key_enum" AS ENUM('KEY_VIEW')`,
    );
    await queryRunner.query(
      `ALTER TABLE "permissions" ADD "key" "public"."permissions_key_enum" NOT NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_017943867ed5ceef9c03edd974" ON "permissions" USING btree ("key") `,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_84bf568e6035977b73568003bc"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_9cc2161923f9d2590c64d7b8de"`,
    );
    await queryRunner.query(`DROP TABLE "dynamic_virtual_accounts"`);
  }
}
