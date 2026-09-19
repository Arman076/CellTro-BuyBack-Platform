import { Module } from "@nestjs/common";
import { OTP_PROVIDER } from "./contracts/otp-provider.js";
import { Msg91OtpProvider } from "./providers/msg91-otp.provider.js";
import { OtpService } from "./otp.service.js";

/*
 * PREPARED BUT NOT ACTIVE YET.
 *
 * Do NOT import this module into AppModule until the MSG91 account,
 * Authkey and OTP template are ready.
 */
@Module({
  providers: [
    Msg91OtpProvider,
    {
      provide: OTP_PROVIDER,
      useExisting: Msg91OtpProvider,
    },
    OtpService,
  ],
  exports: [OtpService],
})
export class OtpModule {}
