import nodemailer from "nodemailer";
import { ApiError } from "./apiError.js";

const sendEmail = async (options) => {
    try {
        // Create transporter with debug logging
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            secure: false,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            },
            debug: true, // Enable debug logs
            logger: true  // Log to console
        });

        // Verify connection
        await transporter.verify();
        console.log("SMTP connection verified successfully");

        const mailOptions = {
            from: `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_FROM_EMAIL}>`,
            to: options.email,
            subject: options.subject,
            text: options.message,
            html: options.html
        };

        const info = await transporter.sendMail(mailOptions);
        console.log("Email sent successfully:", info.messageId);
        
        return info;
    } catch (error) {
        console.error("Email sending failed:", {
            error: error.message,
            code: error.code,
            response: error.response
        });
        throw new ApiError(500, `Failed to send email: ${error.message}`);
    }
};

export { sendEmail };