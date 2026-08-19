import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBusinessDocumentsUniqueConstraint1787172272124 implements MigrationInterface {
  name = 'AddBusinessDocumentsUniqueConstraint1787172272124';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_business_documents_businessId_documentName" ON "business_documents" ("businessId", "documentName")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_business_documents_businessId_documentName"`,
    );
  }
}
