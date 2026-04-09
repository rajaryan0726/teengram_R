import nodemailer from 'nodemailer';

// Create a transporter using environment variables
// For production, you would configure an actual SMTP service like Gmail, Sendgrid, etc.
// Here we use a standard SMTP configuration check.
const transporter = nodemailer.createTransport({
    // You should configure standard email config in environment variables
    // For now we will assume standard Gmail setup or you could use ethereal for testing
    service: 'gmail',  
    auth: {
        user: process.env.EMAIL_USER, 
        pass: process.env.EMAIL_PASS,
    },
});

export const sendNotificationEmail = async (to, subject, htmlContent) => {
    try {
        // Only attempt to send if credentials are provided
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS || process.env.EMAIL_USER === 'your_email@gmail.com') {
            console.log("Email Notification Skipped (No email credentials provided):");
            console.log(`To: ${to}`);
            console.log(`Subject: ${subject}`);
            return true;
        }

        const info = await transporter.sendMail({
            from: `"TeenGram Verification" <${process.env.EMAIL_USER}>`,
            to: to,
            subject: subject,
            html: htmlContent,
        });

        console.log("Message sent: %s", info.messageId);
        return true;
    } catch (error) {
        console.error("Error sending email:", error);
        return false;
    }
};
