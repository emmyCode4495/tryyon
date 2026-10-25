import { NextResponse } from "next/server";
import { Resend } from "resend";
import { z } from "zod";

const schema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(200),
  store: z.string().trim().max(200).optional(),
  message: z.string().trim().max(2000).optional(),
  website: z.string().max(0).optional(), // honeypot, must stay empty
});

export async function POST(request: Request) {
  const key = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO_EMAIL;
  if (!key || !to) {
    return NextResponse.json({ error: "Contact is not configured" }, { status: 503 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Please check your details" }, { status: 400 });
  }
  const { name, email, store, message } = parsed.data;

  const { error } = await new Resend(key).emails.send({
    from: "tryyON <hello@yourdomain.com>", // must be on your verified domain
    to,
    replyTo: email, // hitting reply goes to the visitor
    subject: `tryyON for brands${store ? `: ${store}` : ""}`,
    text: `Name: ${name}\nEmail: ${email}\nStore: ${store || "-"}\n\n${message || "(no message)"}`,
  });

  if (error) return NextResponse.json({ error: "Could not send. Try again." }, { status: 502 });
  return NextResponse.json({ ok: true });
}