import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Put,
} from '@nestjs/common';

import { QuestionnaireCapabilityService } from './questionnaire-capability.service.js';

@Controller('questionnaire/capabilities')
export class QuestionnaireCapabilityController {
  constructor(
    private readonly capabilityService: QuestionnaireCapabilityService,
  ) {}

  @Get()
  getCapabilities() {
    return this.capabilityService.getCapabilities();
  }

  @Get('products/:productId')
  getProductCapabilities(
    @Param('productId', ParseIntPipe) productId: number,
  ) {
    return this.capabilityService.getProductCapabilities(productId);
  }

  @Put('products/:productId')
  setProductCapabilities(
    @Param('productId', ParseIntPipe) productId: number,
    @Body() body: { capabilityIds: number[] },
  ) {
    return this.capabilityService.setProductCapabilities(
      productId,
      body.capabilityIds || [],
    );
  }

  @Put('options/:optionId')
  setOptionCapabilities(
    @Param('optionId', ParseIntPipe) optionId: number,
    @Body() body: { capabilityIds: number[] },
  ) {
    return this.capabilityService.setOptionCapabilities(
      optionId,
      body.capabilityIds || [],
    );
  }
}
