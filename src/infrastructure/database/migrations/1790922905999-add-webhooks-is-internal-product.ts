import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWebhooksIsInternalProduct1790922905999
  implements MigrationInterface
{
  name = 'AddWebhooksIsInternalProduct1790922905999';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "webhooks" ADD "isInternalProduct" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "webhooks" DROP COLUMN "isInternalProduct"`,
    );
  }
}
