import { Resend } from "resend";

let client: Resend | undefined;

// Lazy so importing this module never needs RESEND_API_KEY.
function resend(): Resend {
  client ??= new Resend(process.env.RESEND_API_KEY);
  return client;
}

export async function sendEmail(message: {
  to: string;
  subject: string;
  text: string;
}): Promise<void> {
  if (!process.env.RESEND_API_KEY && process.env.NODE_ENV !== "production") {
    console.info(`[email] to: ${message.to}\n${message.subject}\n\n${message.text}`);
    return;
  }
  const { error } = await resend().emails.send({
    from: process.env.EMAIL_FROM ?? "",
    ...message,
  });
  if (error) throw new Error(`Email send failed: ${error.message}`);
}
