import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';
import { env } from '../config/env';
import { loadTemplate } from '../emails/template-loader';

@Injectable()
export class MailService {
  private readonly resend = new Resend(env().RESEND_API_KEY);
  private readonly logger = new Logger(MailService.name);

  async sendOtp(email: string, otp: string, name: string): Promise<void> {
    const html = loadTemplate('verify-email', { NAME: name, OTP: otp });
    const { error } = await this.resend.emails.send({
      from: env().EMAIL_FROM,
      to: email,
      subject: 'MedArchive — Verify your email',
      html,
    });

    if (error) {
      this.logger.error(
        `OTP send failed email=${email} error=${JSON.stringify(error)}`,
      );
      throw new Error('Failed to send verification email');
    }

    this.logger.log(`OTP sent email=${email}`);
  }

  async sendWelcome(email: string, name: string): Promise<void> {
    const html = loadTemplate('welcome', {
      NAME: name,
      APP_URL: env().APP_URL,
    });
    await this.send(email, 'Welcome to MedArchive', html);
  }

  async sendPasswordReset(
    email: string,
    name: string,
    resetLink: string,
    expiresIn: string,
  ): Promise<void> {
    const html = loadTemplate('password-reset', {
      NAME: name,
      RESET_LINK: resetLink,
      EXPIRES_IN: expiresIn,
    });
    await this.send(email, 'Reset your MedArchive password', html);
  }

  async sendLoginAlert(
    email: string,
    name: string,
    ip: string,
    time: string,
  ): Promise<void> {
    const html = loadTemplate('login-alert', {
      NAME: name,
      TIME: time,
      IP: ip,
      APP_URL: env().APP_URL,
    });
    await this.send(email, 'New login to your MedArchive account', html);
  }

  async sendWalletLinked(
    email: string,
    name: string,
    address: string,
    network: string,
  ): Promise<void> {
    const html = loadTemplate('wallet-linked', {
      NAME: name,
      ADDRESS: address,
      NETWORK: network,
      APP_URL: env().APP_URL,
    });
    await this.send(email, 'Stellar wallet linked to your account', html);
  }

  async sendHealthRecordUploaded(
    email: string,
    name: string,
    title: string,
    recordType: string,
  ): Promise<void> {
    const html = loadTemplate('health-record-uploaded', {
      NAME: name,
      TITLE: title,
      RECORD_TYPE: recordType,
      APP_URL: env().APP_URL,
    });
    await this.send(email, 'Health record saved — MedArchive', html);
  }

  async sendProviderInvitation(
    email: string,
    name: string,
    activationLink: string,
  ): Promise<void> {
    const html = loadTemplate('provider-invitation', {
      NAME: name,
      ACTIVATION_LINK: activationLink,
    });
    await this.send(email, "You've been invited to MedArchive Africa", html);
  }

  async sendEmergencyContactAdded(
    contactEmail: string,
    contactName: string,
    patientName: string,
  ): Promise<void> {
    const html = loadTemplate('emergency-contact-added', {
      CONTACT_NAME: contactName,
      PATIENT_NAME: patientName,
      APP_URL: env().APP_URL,
    });
    await this.send(
      contactEmail,
      `${patientName} added you as an emergency contact`,
      html,
    );
  }

  private async send(to: string, subject: string, html: string): Promise<void> {
    const { error } = await this.resend.emails.send({
      from: env().EMAIL_FROM,
      to,
      subject,
      html,
    });
    if (error)
      this.logger.error(
        `Email send failed to=${to} subject="${subject}" error=${JSON.stringify(error)}`,
      );
  }
}
