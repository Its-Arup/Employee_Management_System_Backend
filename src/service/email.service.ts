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
            },
            // Connection pool and timeout settings for better performance on Render
            pool: true,
            maxConnections: 5,
            maxMessages: 100,
            connectionTimeout: 10000, // 10 seconds
            greetingTimeout: 5000, // 5 seconds
            socketTimeout: 15000, // 15 seconds
            // Force IPv4 - Render doesn't support IPv6 properly
            family: 4
        } as nodemailer.TransportOptions);
    }

    /**
     * Verify SMTP connection
     */
    async verifyConnection(): Promise<boolean> {
        try {
            await this.transporter.verify();
            logger.info('SMTP connection verified successfully');
            return true;
        } catch (error) {
            logger.error('SMTP connection verification failed', { meta: error });
            return false;
        }
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
            const info = await this.transporter.sendMail(mailOptions);
            logger.info('Verification email sent successfully', { 
                meta: { 
                    email, 
                    messageId: info.messageId,
                    response: info.response 
                } 
            });
        } catch (error) {
            logger.error('Error sending verification email', { 
                meta: { 
                    error, 
                    email,
                    errorMessage: error instanceof Error ? error.message : 'Unknown error'
                } 
            });
            throw new Error(`Failed to send verification email: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

    /**
     * Send account approval email
     */
    async sendApprovalEmail(email: string, displayName: string, roles: string[], employeeId?: string): Promise<void> {
        const mailOptions = {
            from: `"${ENV.EMAIL_FROM_NAME}" <${ENV.EMAIL_FROM}>`,
            to: email,
            subject: 'Account Approved - Employee Management System',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
                        .content { background-color: #f9f9f9; padding: 30px; border-radius: 5px; margin-top: 20px; }
                        .info-box { background-color: #fff; border-left: 4px solid #4CAF50; padding: 15px; margin: 20px 0; }
                        .button { display: inline-block; background-color: #4CAF50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                        .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>🎉 Your Account Has Been Approved!</h1>
                        </div>
                        <div class="content">
                            <h2>Hello ${displayName},</h2>
                            <p>Great news! Your account has been approved by the administrator.</p>
                            <div class="info-box">
                                <p><strong>Account Details:</strong></p>
                                <p>Email: ${email}</p>
                                ${employeeId ? `<p>Employee ID: ${employeeId}</p>` : ''}
                                <p>Assigned Roles: ${roles.map(r => r.charAt(0).toUpperCase() + r.slice(1)).join(', ')}</p>
                            </div>
                            <p>You can now log in to the Employee Management System and start using all the features available to you.</p>
                            <div style="text-align: center;">
                                <a href="${ENV.FRONTEND_URL || 'http://localhost:5173'}/login" class="button">Login Now</a>
                            </div>
                            <p>If you have any questions or need assistance, please contact the HR department or system administrator.</p>
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
            logger.error('Error sending approval email', { meta: error });
            // Don't throw error as approval is already done
        }
    }

    /**
     * Send account rejection email
     */
    async sendRejectionEmail(email: string, displayName: string, reason: string): Promise<void> {
        const mailOptions = {
            from: `"${ENV.EMAIL_FROM_NAME}" <${ENV.EMAIL_FROM}>`,
            to: email,
            subject: 'Account Application Update - Employee Management System',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background-color: #f44336; color: white; padding: 20px; text-align: center; }
                        .content { background-color: #f9f9f9; padding: 30px; border-radius: 5px; margin-top: 20px; }
                        .info-box { background-color: #fff; border-left: 4px solid #f44336; padding: 15px; margin: 20px 0; }
                        .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>Account Application Update</h1>
                        </div>
                        <div class="content">
                            <h2>Hello ${displayName},</h2>
                            <p>Thank you for your interest in joining our Employee Management System.</p>
                            <p>After careful review, we regret to inform you that your account application has not been approved at this time.</p>
                            <div class="info-box">
                                <p><strong>Reason:</strong></p>
                                <p>${reason}</p>
                            </div>
                            <p>If you believe this decision was made in error or would like to discuss this further, please contact our HR department or system administrator.</p>
                            <p>Thank you for your understanding.</p>
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
            logger.error('Error sending rejection email', { meta: error });
            // Don't throw error as rejection is already done
        }
    }

    /**
     * Send salary paid notification email
     */
    async sendSalaryPaidEmail(
        email: string,
        displayName: string,
        salaryDetails: {
            month: number;
            year: number;
            netSalary: number;
            grossSalary: number;
            totalDeductions: number;
            creditDate?: Date;
        }
    ): Promise<void> {
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        const monthName = monthNames[salaryDetails.month - 1];

        const mailOptions = {
            from: `"${ENV.EMAIL_FROM_NAME}" <${ENV.EMAIL_FROM}>`,
            to: email,
            subject: `Salary Paid - ${monthName} ${salaryDetails.year}`,
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
                        .content { background-color: #f9f9f9; padding: 30px; border-radius: 5px; margin-top: 20px; }
                        .salary-box { background-color: #fff; border: 2px solid #4CAF50; padding: 20px; margin: 20px 0; border-radius: 5px; }
                        .salary-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
                        .salary-row:last-child { border-bottom: none; }
                        .label { font-weight: normal; color: #666; }
                        .value { font-weight: bold; color: #333; }
                        .net-salary { background-color: #4CAF50; color: white; padding: 15px; text-align: center; border-radius: 5px; margin-top: 20px; }
                        .net-amount { font-size: 28px; font-weight: bold; }
                        .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>💰 Salary Payment Confirmation</h1>
                        </div>
                        <div class="content">
                            <h2>Hello ${displayName},</h2>
                            <p>Your salary for <strong>${monthName} ${salaryDetails.year}</strong> has been processed and paid.</p>
                            
                            <div class="salary-box">
                                <div class="salary-row">
                                    <span class="label">Gross Salary:</span>
                                    <span class="value">₹${salaryDetails.grossSalary.toLocaleString()}</span>
                                </div>
                                <div class="salary-row">
                                    <span class="label">Total Deductions:</span>
                                    <span class="value" style="color: #f44336;">-₹${salaryDetails.totalDeductions.toLocaleString()}</span>
                                </div>
                            </div>

                            <div class="net-salary">
                                <p style="margin: 0; font-size: 16px;">Net Salary Paid</p>
                                <p class="net-amount" style="margin: 10px 0 0 0;">₹${salaryDetails.netSalary.toLocaleString()}</p>
                            </div>

                            ${salaryDetails.creditDate ? `<p style="text-align: center; margin-top: 20px; color: #666;">Credit Date: ${new Date(salaryDetails.creditDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>` : ''}

                            <p style="margin-top: 30px;">You can view the complete salary breakdown and download your salary slip by logging into the Employee Management System.</p>
                            
                            <div style="text-align: center; margin-top: 20px;">
                                <a href="${ENV.FRONTEND_URL || 'http://localhost:5173'}/salaries" style="display: inline-block; background-color: #4CAF50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px;">View Salary Details</a>
                            </div>

                            <p style="margin-top: 30px;">If you have any questions regarding your salary, please contact the HR department.</p>
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
            logger.error('Error sending salary paid email', { meta: error });
            // Don't throw error as salary is already marked as paid
        }
    }
}

export const emailService = new EmailService();
