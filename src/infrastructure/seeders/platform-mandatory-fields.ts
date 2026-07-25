import { DataSource, EntityManager } from 'typeorm';
import AppDataSource from '../database/typeorm.data-source';
import {
  FormOwnerType,
  FormType,
  OrganisationCustomForm,
} from '../../modules/service-checkout/entity/service_payment_form.entity';
import { RequestEnvironment } from '../../shared/enum';

export const platformMandatoryFieldsSeed = [
  {
    formKey: 'payerEmail',
    formLabel: 'Email Address',
    formType: FormType.EMAIL,
    required: 'Y',
    formLength: '255',
    sequenceNo: '1',
  },
  {
    formKey: 'payerFullName',
    formLabel: 'Full Name',
    formType: FormType.TEXT,
    required: 'Y',
    formLength: '255',
    sequenceNo: '2',
  },
  {
    formKey: 'phoneNumber',
    formLabel: 'Phone Number',
    formType: FormType.TEL,
    required: 'N',
    formLength: '20',
    sequenceNo: '3',
  },
  {
    formKey: 'totalAmount',
    formLabel: 'Total Amount',
    formType: FormType.NUMBER,
    required: 'Y',
    formLength: '20',
    sequenceNo: '4',
  },
];

const upsertMandatoryField = async (
  manager: EntityManager,
  environment: RequestEnvironment,
  fieldData: (typeof platformMandatoryFieldsSeed)[number],
): Promise<OrganisationCustomForm> => {
  const existingField = await manager.findOne(OrganisationCustomForm, {
    where: {
      formKey: fieldData.formKey,
      ownerType: FormOwnerType.PLATFORM,
      environment,
    },
  });

  if (existingField) {
    manager.merge(OrganisationCustomForm, existingField, {
      formLabel: fieldData.formLabel,
      formType: fieldData.formType,
      required: fieldData.required,
      formLength: fieldData.formLength,
      sequenceNo: fieldData.sequenceNo,
      isMandatory: true,
    });

    return manager.save(existingField);
  }

  const field = manager.create(OrganisationCustomForm, {
    ...fieldData,
    environment,
    isMandatory: true,
    ownerType: FormOwnerType.PLATFORM,
    ownerId: null,
  });

  return manager.save(field);
};

export async function seedPlatformMandatoryFields(
  dataSource: DataSource = AppDataSource,
): Promise<void> {
  const shouldDestroyDataSource = !dataSource.isInitialized;

  if (!dataSource.isInitialized) {
    await dataSource.initialize();
  }

  try {
    console.log('Seeding platform mandatory fields...');

    await dataSource.transaction(async (manager) => {
      for (const environment of Object.values(RequestEnvironment)) {
        for (const fieldData of platformMandatoryFieldsSeed) {
          await upsertMandatoryField(manager, environment, fieldData);
          console.log(`  ✓ ${environment} ${fieldData.formKey}`);
        }
      }
    });

    console.log(
      `Platform mandatory fields seeded: ${platformMandatoryFieldsSeed.length * 2}`,
    );
  } finally {
    if (shouldDestroyDataSource) {
      await dataSource.destroy();
    }
  }
}

if (require.main === module) {
  seedPlatformMandatoryFields().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
