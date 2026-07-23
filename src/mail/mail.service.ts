import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';
import { env } from '../config/env';

@Injectable()
export class MailService {
  private readonly resend = new Resend(env().RESEND_API_KEY);
  private readonly logger = new Logger(MailService.name);

  async sendOtp(email: string, otp: string): Promise<void> {
    const { error } = await this.resend.emails.send({
      from: env().EMAIL_FROM,
      to: email,
      subject: 'MedArchive — Verify your email',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
          <h2>Verify your email</h2>
          <p>Your one-time code is:</p>
          <div style="font-size:32px;font-weight:bold;letter-spacing:8px;padding:16px 0">${otp}</div>
          <p>Expires in <strong>10 minutes</strong>. Do not share this code.</p>
        </div>
      `,
    });

    if (error) {
      this.logger.error(`OTP send failed email=${email} error=${JSON.stringify(error)}`);
      throw new Error('Failed to send verification email');
    }

    this.logger.log(`OTP sent email=${email}`);
  }
}
