import nodemailer from 'nodemailer';

export const handler = async (event: any) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { to, subject, text } = JSON.parse(event.body);

    if (!process.env.SMTP_EMAIL || !process.env.SMTP_PASSWORD) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "SMTP credentials not configured" }),
      };
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    await transporter.sendMail({
      from: `"VELO Rentals Support" <${process.env.SMTP_EMAIL}>`,
      replyTo: process.env.SMTP_EMAIL,
      to,
      subject,
      text,
      html: `<div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 8px;">
               ${text.replace(/\n/g, "<br>")}
               <br><br>
               <hr style="border: none; border-top: 1px solid #eaeaea;" />
               <p style="font-size: 12px; color: #888;">This is an automated message from VELO Rentals. Please do not reply directly to this email unless necessary.</p>
             </div>`,
    });

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ success: true }),
    };
  } catch (error: any) {
    console.error("Error sending email:", error);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ error: error.message }),
    };
  }
};
