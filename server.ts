import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import nodemailer from "nodemailer";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route for sending automated emails
  app.post("/api/send-email", async (req, res) => {
    try {
      const { to, subject, text } = req.body;

      if (!process.env.SMTP_EMAIL || !process.env.SMTP_PASSWORD) {
        return res.status(500).json({ error: "SMTP credentials not configured" });
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

      res.json({ success: true });
    } catch (error: any) {
      console.error("Error sending email:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // Use *all instead of * for express v5, but for express v4 use *
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
