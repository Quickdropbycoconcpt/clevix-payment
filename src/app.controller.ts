import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';
import { Public } from './modules/authentication/decorators/public.decorator';

@ApiTags('health')
@Public()
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'Application health check' })
  @ApiOkResponse({ description: 'Application is running.' })
  getHello(): string {
    return this.appService.getHello();
  }
}
