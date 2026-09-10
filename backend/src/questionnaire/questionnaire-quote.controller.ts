import { Body, Controller, Post } from '@nestjs/common';
import { QuestionnaireQuoteService } from './questionnaire-quote.service.js';

@Controller('questionnaire/quote')
export class QuestionnaireQuoteController {
  constructor(
    private readonly service: QuestionnaireQuoteService,
  ) {}

  @Post('preview')
  preview(@Body() body: any) {
    return this.service.calculateQuote(body);
  }

  @Post('send-otp')
  sendOtp(@Body() body: any) {
    return this.service.sendOtp(body);
  }

  @Post('verify-otp')
  verifyOtp(
    @Body() body: { sessionId: string; otp: string },
  ) {
    return this.service.verifyOtp(body.sessionId, body.otp);
  }
}
