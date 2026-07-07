import { createTransport } from 'nodemailer';
import { appConfig } from './config.js';
class Mailer {
    enabled = false;
    transporter;
    constructor() {
        if (appConfig.smtpHost && appConfig.smtpPort && appConfig.mailFromUser) {
            this.enabled = true;
            this.transporter = createTransport({
                host: appConfig.smtpHost,
                port: appConfig.smtpPort,
                auth: appConfig.smtpUser && appConfig.smtpPassword
                    ? { type: 'LOGIN', user: appConfig.smtpUser, pass: appConfig.smtpPassword }
                    : undefined,
                secure: (appConfig.smtpSecurity || '').toLowerCase() === 'tls',
            });
        }
    }
    async sendMail(to, { subject, text }) {
        if (!this.enabled || !this.transporter) {
            throw new Error('Email not configured');
        }
        await this.transporter.sendMail({
            to,
            from: appConfig.mailFromUser,
            subject,
            text,
        });
    }
}
export const mailer = new Mailer();
