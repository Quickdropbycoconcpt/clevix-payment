import { BadRequestException, Injectable } from '@nestjs/common';
import { FeeConfigurationService } from 'src/modules/fees-configuration/service/fees_revenue.service';
import { CollectionProvider } from 'src/modules/Api/collection/adapters/contracts/collection-adapter.types';
import { SupportedPaymentMethod } from '../entity/invoice_transaction.entity';
import { OrganisationInvoice } from '../entity/service_checkout_invoice.entity';
import { FEE_SOURCE_BY_METHOD } from 'src/shared/constants/invoice.constants';

export type InvoiceFeePreview = {
  feeBearer: 'customer' | 'business';
  fee: string;
  baseAmount: string;
  totalAmount: string;
};

@Injectable()
export class InvoiceFeeService {
  constructor(private readonly feeConfigService: FeeConfigurationService) {}

  async computeFee(
    invoice: OrganisationInvoice,
    method: SupportedPaymentMethod,
  ): Promise<InvoiceFeePreview> {
    const feeSource = FEE_SOURCE_BY_METHOD[method];

    if (!feeSource) {
      throw new BadRequestException(`Unsupported payment method: ${method}`);
    }

    const chargeFee = invoice.service?.paymentrule?.chargeFee ?? false;
    const baseAmount = BigInt(invoice.amount);

    if (!chargeFee) {
      return {
        feeBearer: 'business',
        fee: '0',
        baseAmount: baseAmount.toString(),
        totalAmount: baseAmount.toString(),
      };
    }

    const { chargedFee } = await this.feeConfigService.getFeeBySource(
      feeSource,
      invoice.businessId,
      CollectionProvider.VFD,
      invoice.amount,
    );

    return {
      feeBearer: 'customer',
      fee: chargedFee.toString(),
      baseAmount: baseAmount.toString(),
      totalAmount: (baseAmount + chargedFee).toString(),
    };
  }
}
