import net from "node:net";
import tls from "node:tls";

/**
 * Mailer (0011) — the email-verification + password-reset transport,
 * shaped exactly like the diagnosis provider (lib/server/provider.ts):
 * an interface, an env-configured real implementation, and a recording
 * stub for tests.
 *
 * HONESTY RULE (the rebuild's standing one): when no SMTP env is wired,
 * sends report `not_configured` — the calling flow still generates and
 * stores its code and answers a typed state, but NOTHING pretends an
 * email was delivered. This module never logs message bodies: a body
 * can carry a live code, and codes never reach a log.
 *
 * Env (read at call time):
 *   SMTP_HOST   e.g. smtp.example.com          (required)
 *   MAIL_FROM   the From address               (required)
 *   SMTP_PORT   default 587 (465 = implicit TLS)
 *   SMTP_SECURE "true"/"false" — default: true on port 465
 *   SMTP_USER / SMTP_PASS — AUTH LOGIN when both are set
 */

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
}

export type MailDelivery =
  | { status: "sent" }
  | { status: "not_configured" }
  | { status: "failed"; reason: string };

export interface Mailer {
  readonly name: string;
  isConfigured(): boolean;
  send(message: MailMessage): Promise<MailDelivery>;
}

export function isMailConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.MAIL_FROM);
}

// ---------------------------------------------------------------------------
// SMTP implementation — a deliberately minimal client (EHLO, STARTTLS
// when offered, AUTH LOGIN, one message per connection). No dependency;
// outbound mail is the only thing it does.
// ---------------------------------------------------------------------------

const SMTP_TIMEOUT_MS = 10_000;

interface SmtpReply {
  code: number;
  lines: string[];
}

class SmtpSession {
  private socket: net.Socket | tls.TLSSocket;
  private buffer = "";
  private waiters: Array<{
    resolve: (reply: SmtpReply) => void;
    reject: (err: Error) => void;
  }> = [];
  private partial: string[] = [];

  constructor(socket: net.Socket | tls.TLSSocket) {
    this.socket = socket;
    socket.setEncoding("utf8");
    socket.on("data", (chunk: string) => this.onData(chunk));
    socket.on("error", (err) => this.failAll(err));
    socket.on("close", () => this.failAll(new Error("smtp_closed")));
  }

  private onData(chunk: string): void {
    this.buffer += chunk;
    for (;;) {
      const idx = this.buffer.indexOf("\r\n");
      if (idx < 0) return;
      const line = this.buffer.slice(0, idx);
      this.buffer = this.buffer.slice(idx + 2);
      const match = /^(\d{3})([ -])(.*)$/.exec(line);
      if (!match) continue;
      this.partial.push(line);
      if (match[2] === " ") {
        const reply: SmtpReply = { code: Number(match[1]), lines: this.partial };
        this.partial = [];
        const waiter = this.waiters.shift();
        if (waiter) waiter.resolve(reply);
      }
    }
  }

  private failAll(err: Error): void {
    const pending = this.waiters;
    this.waiters = [];
    for (const w of pending) w.reject(err);
  }

  writeRaw(data: string): void {
    this.socket.write(data);
  }

  readReply(): Promise<SmtpReply> {
    return new Promise((resolve, reject) => {
      this.waiters.push({ resolve, reject });
    });
  }

  async command(line: string, expect: number[]): Promise<SmtpReply> {
    const replyPromise = this.readReply();
    this.socket.write(`${line}\r\n`);
    const reply = await replyPromise;
    if (!expect.includes(reply.code)) {
      throw new Error(`smtp_unexpected_${reply.code}`);
    }
    return reply;
  }

  extensions(reply: SmtpReply): Set<string> {
    const out = new Set<string>();
    for (const line of reply.lines) {
      const token = line.slice(4).trim().split(/\s+/)[0]?.toUpperCase();
      if (token) out.add(token);
    }
    return out;
  }

  upgradeToTls(servername: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const plain = this.socket as net.Socket;
      plain.removeAllListeners("data");
      plain.removeAllListeners("error");
      plain.removeAllListeners("close");
      const secure = tls.connect({ socket: plain, servername });
      secure.once("secureConnect", () => {
        this.socket = secure;
        secure.setEncoding("utf8");
        secure.on("data", (chunk: string) => this.onData(chunk));
        secure.on("error", (err) => this.failAll(err));
        secure.on("close", () => this.failAll(new Error("smtp_closed")));
        resolve();
      });
      secure.once("error", reject);
    });
  }

  close(): void {
    try {
      this.socket.end();
      this.socket.destroy();
    } catch {
      // Already gone.
    }
  }
}

function connectSocket(host: string, port: number, secure: boolean): Promise<net.Socket | tls.TLSSocket> {
  return new Promise((resolve, reject) => {
    const socket = secure
      ? tls.connect({ host, port, servername: host })
      : net.connect({ host, port });
    const ready = secure ? "secureConnect" : "connect";
    const timer = setTimeout(() => {
      socket.destroy();
      reject(new Error("smtp_timeout"));
    }, SMTP_TIMEOUT_MS);
    socket.once(ready, () => {
      clearTimeout(timer);
      resolve(socket as net.Socket);
    });
    socket.once("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

/** Wrap one SMTP message send with an overall timeout. */
async function withTimeout<T>(work: Promise<T>): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("smtp_timeout")), SMTP_TIMEOUT_MS * 3);
  });
  try {
    return await Promise.race([work, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export class SmtpMailer implements Mailer {
  readonly name = "smtp";

  isConfigured(): boolean {
    return isMailConfigured();
  }

  async send(message: MailMessage): Promise<MailDelivery> {
    if (!this.isConfigured()) return { status: "not_configured" };
    const host = process.env.SMTP_HOST as string;
    const from = process.env.MAIL_FROM as string;
    const port = Number(process.env.SMTP_PORT ?? 587) || 587;
    const secure =
      process.env.SMTP_SECURE !== undefined
        ? process.env.SMTP_SECURE === "true"
        : port === 465;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    // Holder object: the session is created inside the timed closure,
    // and the finally below must be able to close it.
    const holder: { session: SmtpSession | null } = { session: null };
    try {
      return await withTimeout(
        (async (): Promise<MailDelivery> => {
          const socket = await connectSocket(host, port, secure);
          const session = new SmtpSession(socket);
          holder.session = session;
          const greeting = await session.readReply();
          if (greeting.code !== 220) throw new Error(`smtp_unexpected_${greeting.code}`);
          let ehlo = await session.command(`EHLO ${host}`, [250]);
          if (!secure && session.extensions(ehlo).has("STARTTLS")) {
            await session.command("STARTTLS", [220]);
            await session.upgradeToTls(host);
            ehlo = await session.command(`EHLO ${host}`, [250]);
          }
          if (user && pass) {
            await session.command("AUTH LOGIN", [334]);
            await session.command(Buffer.from(user, "utf8").toString("base64"), [334]);
            await session.command(Buffer.from(pass, "utf8").toString("base64"), [235]);
          }
          await session.command(`MAIL FROM:<${from}>`, [250]);
          await session.command(`RCPT TO:<${message.to}>`, [250, 251]);
          await session.command("DATA", [354]);
          const headers = [
            `From: ${from}`,
            `To: ${message.to}`,
            `Subject: ${message.subject.replace(/[\r\n]+/g, " ")}`,
            `Date: ${new Date().toUTCString()}`,
            "MIME-Version: 1.0",
            'Content-Type: text/plain; charset="utf-8"',
            "",
          ];
          const body = message.text
            .split(/\r?\n/)
            .map((line) => (line.startsWith(".") ? `.${line}` : line))
            .join("\r\n");
          const dataReplyPromise = session.readReply();
          session.writeRaw(`${headers.join("\r\n")}${body}\r\n.\r\n`);
          const dataReply = await dataReplyPromise;
          if (dataReply.code !== 250) throw new Error(`smtp_unexpected_${dataReply.code}`);
          try {
            await session.command("QUIT", [221]);
          } catch {
            // The message already landed; a rude goodbye is not a failure.
          }
          return { status: "sent" };
        })(),
      );
    } catch (err) {
      // Reason carries the failure CLASS only — never the message, the
      // recipient beyond what the caller already knows, or a code.
      return { status: "failed", reason: err instanceof Error ? err.message : "smtp_failed" };
    } finally {
      holder.session?.close();
    }
  }
}

// ---------------------------------------------------------------------------
// Recording stub — tests only. Remembers every message verbatim so the
// suite can read the issued code back out of the "email" and drive the
// full lifecycle. Never touches the network.
// ---------------------------------------------------------------------------

export class RecordingMailer implements Mailer {
  readonly name = "recording";
  readonly messages: MailMessage[] = [];

  isConfigured(): boolean {
    return true;
  }

  async send(message: MailMessage): Promise<MailDelivery> {
    this.messages.push(message);
    return { status: "sent" };
  }
}

// ---------------------------------------------------------------------------

/** Unwired-environment mailer: reports not_configured, sends nothing. */
export class UnconfiguredMailer implements Mailer {
  readonly name = "unconfigured";

  isConfigured(): boolean {
    return false;
  }

  async send(): Promise<MailDelivery> {
    return { status: "not_configured" };
  }
}

/** The production mailer for the current environment. */
export function getMailer(): Mailer {
  return isMailConfigured() ? new SmtpMailer() : new UnconfiguredMailer();
}
