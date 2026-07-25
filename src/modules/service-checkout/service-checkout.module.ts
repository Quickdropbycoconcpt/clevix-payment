import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrganizationService } from './entity/service_definition.entity';
import { OrganisationCustomForm } from './entity/service_payment_form.entity';
import { OrganisationFormOption } from './entity/service_payment_form_option.entity';
import { OrganisationPaymentRules } from './entity/service_payment_rules.entity';
import { ServiceItems } from './entity/service_items.entity';
import { ServiceCheckout } from './service/service-checkout.service';
import { ServiceCheckoutController } from './controller/service-checkout.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OrganizationService,
      OrganisationCustomForm,
      OrganisationFormOption,
      OrganisationPaymentRules,
      ServiceItems,
    ]),
  ],
  controllers: [ServiceCheckoutController],
  providers: [ServiceCheckout],
  exports: [ServiceCheckout],
})
export class ServiceCheckoutModule {}
