import nodemailer from 'nodemailer';
import { ENV } from '../constant';
import { logger } from '../util';

export class EmailService {
    private transporter: nodemailer.Transporter;

    constructor() {
        this.transporter = nodemailer.createTransport({
            host: ENV.EMAIL_HOST,
            port: ENV.EMAIL_PORT,
            secure: ENV.EMAIL_PORT === 465, // true for 465, false for other ports
            auth: {
                user: ENV.EMAIL_USER,
                pass: ENV.EMAIL_PASSWORD
            }
        });
    }

    /**
     * Send email verification OTP
     */
    async sendVerificationEmail(email: string, displayName: string, otp: string): Promise<void> {
        const mailOptions = {
            from: `"${ENV.EMAIL_FROM_NAME}" <${ENV.EMAIL_FROM}>`,
            to: email,
            subject: 'Verify Your Email - Employee Management System',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
                        .content { background-color: #f9f9f9; padding: 30px; border-radius: 5px; margin-top: 20px; }
                        .otp-box { background-color: #fff; border: 2px dashed #4CAF50; padding: 20px; text-align: center; margin: 20px 0; border-radius: 5px; }
                        .otp-code { font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #4CAF50; font-family: 'Courier New', monospace; }
                        .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>Email Verification</h1>
                        </div>
                        <div class="content">
                            <h2>Hello ${displayName},</h2>
                            <p>Thank you for registering with Employee Management System!</p>
                            <p>Please use the following One-Time Password (OTP) to verify your email address:</p>
                            <div class="otp-box">
                                <div class="otp-code">${otp}</div>
                            </div>
                            <p style="text-align: center; color: #666; font-size: 14px;">Enter this code in the verification page</p>
                            <p><strong>Note:</strong> This OTP will expire in 15 minutes.</p>
                            <p>If you didn't create an account, please ignore this email.</p>
                        </div>
                        <div class="footer">
                            <p>&copy; ${new Date().getFullYear()} Employee Management System. All rights reserved.</p>
                            <p>This is an automated email. Please do not reply.</p>
                        </div>
                    </div>
                </body>
                </html>
            `
        };

        try {
            await this.transporter.sendMail(mailOptions);
        } catch (error) {
            logger.error('Error sending verification email', { meta: error });
            throw new Error('Failed to send verification email');
        }
    }

    /**
     * Send welcome email after email verification
     */
    async sendWelcomeEmail(email: string, displayName: string): Promise<void> {
        const mailOptions = {
            from: `"${ENV.EMAIL_FROM_NAME}" <${ENV.EMAIL_FROM}>`,
            to: email,
            subject: 'Welcome to Employee Management System',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
                        .content { background-color: #f9f9f9; padding: 30px; border-radius: 5px; margin-top: 20px; }
                        .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>Welcome!</h1>
                        </div>
                        <div class="content">
                            <h2>Hello ${displayName},</h2>
                            <p>Your email has been successfully verified!</p>
                            <p>Your account is currently pending approval from an administrator. You will receive another email once your account has been approved.</p>
                            <p>If you have any questions, please contact our support team.</p>
                        </div>
                        <div class="footer">
                            <p>&copy; ${new Date().getFullYear()} Employee Management System. All rights reserved.</p>
                        </div>
                    </div>
                </body>
                </html>
            `
        };

        try {
            await this.transporter.sendMail(mailOptions);
        } catch (error) {
            logger.error('Error sending welcome email', { meta: error });
            // Don't throw error for welcome email as it's not critical
        }
    }

    /**
     * Resend verification OTP
     */
    async resendVerificationEmail(email: string, displayName: string, otp: string): Promise<void> {
        await this.sendVerificationEmail(email, displayName, otp);
    }
}

export const emailService = new EmailService();
