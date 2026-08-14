import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { CardPaymentService } from '../service/card-payment.service';
import { CurrentUser } from 'src/modules/authentication/decorators/current-user.decorator';
import type { RequestScope } from 'src/shared/business-scope';
import { CardPaymentDto, ValidateCardOtpDto } from '../dto/card.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ApiJwtAuthGuard } from 'src/modules/authentication/guards/api-guard';
import { Public } from 'src/modules/authentication/decorators/public.decorator';

@ApiTags('Card Payment transactions')
@Controller('v1/collection')
@ApiBearerAuth('bearer')
@UseGuards(ApiJwtAuthGuard)
export class CardCardPaymentsController {
  constructor(private readonly cardService: CardPaymentService) {}

  @Post('card/initiate')
  async initiateTransaction(
    @Body() body: CardPaymentDto,
    @CurrentUser() scope: RequestScope,
  ) {
    return await this.cardService.initiateCardPayment(
      {
        ...body,
      },
      scope,
    );
  }

  @Post('card/validate-otp')
  async validateOtp(
    @Body() body: ValidateCardOtpDto,
    @CurrentUser() scope: RequestScope,
  ) {
    return await this.cardService.validateCardOtp(body, scope);
  }

  @Public()
  @Post('card/:provider/webhook')
  async incomingWebhook(
    @Param('provider') provider: string,
    @Body() payload: any,
  ) {
    return await this.cardService.incomingWebhook(provider, payload);
  }
}
