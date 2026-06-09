import { MigrationInterface, QueryRunner } from 'typeorm';

export class BusinessMember1780644463636 implements MigrationInterface {
  name = 'BusinessMember1780644463636';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_8ac3ab3b9418ea0499239cdd82"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."permissions_key_enum" AS ENUM('KEY_VIEW')`,
    );
    await queryRunner.query(
      `CREATE TABLE "permissions" ("createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deleteAt" TIMESTAMP, "permissionId" uuid NOT NULL DEFAULT uuid_generate_v4(), "key" "public"."permissions_key_enum" NOT NULL, "description" character varying NOT NULL, CONSTRAINT "PK_b4b17d691e3c22be36b2b9f355a" PRIMARY KEY ("permissionId"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_017943867ed5ceef9c03edd974" ON "permissions"  ("key") `,
    );
    await queryRunner.query(
      `CREATE TABLE "business_role_permissions" ("createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deleteAt" TIMESTAMP, "rolePermissionId" uuid NOT NULL DEFAULT uuid_generate_v4(), "roleId" uuid NOT NULL, "permissionId" uuid NOT NULL, CONSTRAINT "PK_58307edf209d85dc390122e754f" PRIMARY KEY ("rolePermissionId"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_30d94f2130ca24db97d9d52a26" ON "business_role_permissions"  ("roleId", "permissionId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "business_roles" ("createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deleteAt" TIMESTAMP, "roleId" uuid NOT NULL DEFAULT uuid_generate_v4(), "businessId" uuid NOT NULL, "name" character varying NOT NULL, "description" character varying, "isDefault" boolean NOT NULL DEFAULT false, CONSTRAINT "PK_989fb21d93df158d8fd37d6e2a4" PRIMARY KEY ("roleId"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_3be415f19162963a266cac5a92" ON "business_roles"  ("businessId", "name") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."business_members_status_enum" AS ENUM('INVITED', 'ACTIVE', 'SUSPENDED', 'REMOVED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "business_members" ("createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deleteAt" TIMESTAMP, "businessMemberId" uuid NOT NULL DEFAULT uuid_generate_v4(), "businessId" uuid NOT NULL, "userId" uuid NOT NULL, "roleId" uuid NOT NULL, "status" "public"."business_members_status_enum" NOT NULL, "invitedByUserId" uuid, "acceptedAt" TIMESTAMP, CONSTRAINT "PK_5bbb231400ae258eb419855f1dc" PRIMARY KEY ("businessMemberId"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_419792071f3f329280668ca950" ON "business_members"  ("businessId", "userId") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_8ac3ab3b9418ea0499239cdd82" ON "businesses"  ("businessIdentifier") `,
    );
    await queryRunner.query(
      `ALTER TABLE "business_role_permissions" ADD CONSTRAINT "FK_537129dbd8ad84161097d574f25" FOREIGN KEY ("roleId") REFERENCES "business_roles"("roleId") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "business_role_permissions" ADD CONSTRAINT "FK_715feb0cb44e011b43558cf5e7a" FOREIGN KEY ("permissionId") REFERENCES "permissions"("permissionId") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "business_roles" ADD CONSTRAINT "FK_4d001189dfadacd92a17dda8d41" FOREIGN KEY ("businessId") REFERENCES "businesses"("businessId") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "business_members" ADD CONSTRAINT "FK_72a694a5cb3f8f3c49083d845a3" FOREIGN KEY ("businessId") REFERENCES "businesses"("businessId") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "business_members" ADD CONSTRAINT "FK_785e099f43abbd887c1b93f300e" FOREIGN KEY ("userId") REFERENCES "users"("userId") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "business_members" ADD CONSTRAINT "FK_f24cad0249b8e5638599d9c41cb" FOREIGN KEY ("roleId") REFERENCES "business_roles"("roleId") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "business_members" ADD CONSTRAINT "FK_b093eee860fb99a5c86f9bd97f5" FOREIGN KEY ("invitedByUserId") REFERENCES "users"("userId") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "business_members" DROP CONSTRAINT "FK_b093eee860fb99a5c86f9bd97f5"`,
    );
    await queryRunner.query(
      `ALTER TABLE "business_members" DROP CONSTRAINT "FK_f24cad0249b8e5638599d9c41cb"`,
    );
    await queryRunner.query(
      `ALTER TABLE "business_members" DROP CONSTRAINT "FK_785e099f43abbd887c1b93f300e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "business_members" DROP CONSTRAINT "FK_72a694a5cb3f8f3c49083d845a3"`,
    );
    await queryRunner.query(
      `ALTER TABLE "business_roles" DROP CONSTRAINT "FK_4d001189dfadacd92a17dda8d41"`,
    );
    await queryRunner.query(
      `ALTER TABLE "business_role_permissions" DROP CONSTRAINT "FK_715feb0cb44e011b43558cf5e7a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "business_role_permissions" DROP CONSTRAINT "FK_537129dbd8ad84161097d574f25"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_8ac3ab3b9418ea0499239cdd82"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_419792071f3f329280668ca950"`,
    );
    await queryRunner.query(`DROP TABLE "business_members"`);
    await queryRunner.query(
      `DROP TYPE "public"."business_members_status_enum"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_3be415f19162963a266cac5a92"`,
    );
    await queryRunner.query(`DROP TABLE "business_roles"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_30d94f2130ca24db97d9d52a26"`,
    );
    await queryRunner.query(`DROP TABLE "business_role_permissions"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_017943867ed5ceef9c03edd974"`,
    );
    await queryRunner.query(`DROP TABLE "permissions"`);
    await queryRunner.query(`DROP TYPE "public"."permissions_key_enum"`);
    await queryRunner.query(
      `CREATE INDEX "IDX_8ac3ab3b9418ea0499239cdd82" ON "businesses" USING btree ("businessIdentifier") `,
    );
  }
}
