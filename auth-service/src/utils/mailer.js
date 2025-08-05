import nodemailer from 'nodemailer';
import { google } from 'googleapis';
import dotenv from 'dotenv';

dotenv.config();

const {
  GMAIL_CLIENT_ID,
  GMAIL_CLIENT_SECRET,
  GMAIL_REFRESH_TOKEN,
  GMAIL_SENDER_ADDRESS,
} = process.env;

const oauth2Client = new google.auth.OAuth2(
  GMAIL_CLIENT_ID,
  GMAIL_CLIENT_SECRET,
  process.env.GMAIL_REDIRECT_URI || 'https://developers.google.com/oauthplayground'
);

oauth2Client.setCredentials({ refresh_token: GMAIL_REFRESH_TOKEN });

export async function sendEmail({ to, subject, html }) {

    try {
        const { token } = await oauth2Client.getAccessToken();

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
            type: 'OAuth2',
            user: GMAIL_SENDER_ADDRESS,
            clientId: GMAIL_CLIENT_ID,
            clientSecret: GMAIL_CLIENT_SECRET,
            refreshToken: GMAIL_REFRESH_TOKEN,
            accessToken: token,
            },
        });

        const mailOptions = {
            from: 'Wine Store Admin',
            to,
            subject,
            html,
        };

        const result = await transporter.sendMail(mailOptions);
        console.log('[mailer] Preparing to send email...');
        console.log('[mailer] Access token:', token);
        console.log(`[mailer] Email sent to ${to}: ${result.response}`);
        return result;

    } catch (error) {
        console.error('[mailer] Failed to send email:', error);
        console.error('[mailer] Full error:', error.stack);
        throw error;
    }  
}