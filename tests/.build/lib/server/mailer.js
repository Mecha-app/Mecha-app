"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnconfiguredMailer = exports.RecordingMailer = exports.SmtpMailer = void 0;
exports.isMailConfigured = isMailConfigured;
exports.getMailer = getMailer;
const node_net_1 = __importDefault(require("node:net"));
const node_tls_1 = __importDefault(require("node:tls"));
function isMailConfigured() {
    return Boolean(process.env.SMTP_HOST && process.env.MAIL_FROM);
}
// ---------------------------------------------------------------------------
// SMTP implementation — a deliberately minimal client (EHLO, STARTTLS
// when offered, AUTH LOGIN, one message per connection). No dependency;
// outbound mail is the only thing it does.
// ---------------------------------------------------------------------------
const SMTP_TIMEOUT_MS = 10_000;
class SmtpSession {
    socket;
    buffer = "";
    waiters = [];
    partial = [];
    constructor(socket) {
        this.socket = socket;
        socket.setEncoding("utf8");
        socket.on("data", (chunk) => this.onData(chunk));
        socket.on("error", (err) => this.failAll(err));
        socket.on("close", () => this.failAll(new Error("smtp_closed")));
    }
    onData(chunk) {
        this.buffer += chunk;
        for (;;) {
            const idx = this.buffer.indexOf("\r\n");
            if (idx < 0)
                return;
            const line = this.buffer.slice(0, idx);
            this.buffer = this.buffer.slice(idx + 2);
            const match = /^(\d{3})([ -])(.*)$/.exec(line);
            if (!match)
                continue;
            this.partial.push(line);
            if (match[2] === " ") {
                const reply = { code: Number(match[1]), lines: this.partial };
                this.partial = [];
                const waiter = this.waiters.shift();
                if (waiter)
                    waiter.resolve(reply);
            }
        }
    }
    failAll(err) {
        const pending = this.waiters;
        this.waiters = [];
        for (const w of pending)
            w.reject(err);
    }
    writeRaw(data) {
        this.socket.write(data);
    }
    readReply() {
        return new Promise((resolve, reject) => {
            this.waiters.push({ resolve, reject });
        });
    }
    async command(line, expect) {
        const replyPromise = this.readReply();
        this.socket.write(`${line}\r\n`);
        const reply = await replyPromise;
        if (!expect.includes(reply.code)) {
            throw new Error(`smtp_unexpected_${reply.code}`);
        }
        return reply;
    }
    extensions(reply) {
        const out = new Set();
        for (const line of reply.lines) {
            const token = line.slice(4).trim().split(/\s+/)[0]?.toUpperCase();
            if (token)
                out.add(token);
        }
        return out;
    }
    upgradeToTls(servername) {
        return new Promise((resolve, reject) => {
            const plain = this.socket;
            plain.removeAllListeners("data");
            plain.removeAllListeners("error");
            plain.removeAllListeners("close");
            const secure = node_tls_1.default.connect({ socket: plain, servername });
            secure.once("secureConnect", () => {
                this.socket = secure;
                secure.setEncoding("utf8");
                secure.on("data", (chunk) => this.onData(chunk));
                secure.on("error", (err) => this.failAll(err));
                secure.on("close", () => this.failAll(new Error("smtp_closed")));
                resolve();
            });
            secure.once("error", reject);
        });
    }
    close() {
        try {
            this.socket.end();
            this.socket.destroy();
        }
        catch {
            // Already gone.
        }
    }
}
function connectSocket(host, port, secure) {
    return new Promise((resolve, reject) => {
        const socket = secure
            ? node_tls_1.default.connect({ host, port, servername: host })
            : node_net_1.default.connect({ host, port });
        const ready = secure ? "secureConnect" : "connect";
        const timer = setTimeout(() => {
            socket.destroy();
            reject(new Error("smtp_timeout"));
        }, SMTP_TIMEOUT_MS);
        socket.once(ready, () => {
            clearTimeout(timer);
            resolve(socket);
        });
        socket.once("error", (err) => {
            clearTimeout(timer);
            reject(err);
        });
    });
}
/** Wrap one SMTP message send with an overall timeout. */
async function withTimeout(work) {
    let timer;
    const timeout = new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error("smtp_timeout")), SMTP_TIMEOUT_MS * 3);
    });
    try {
        return await Promise.race([work, timeout]);
    }
    finally {
        if (timer)
            clearTimeout(timer);
    }
}
class SmtpMailer {
    name = "smtp";
    isConfigured() {
        return isMailConfigured();
    }
    async send(message) {
        if (!this.isConfigured())
            return { status: "not_configured" };
        const host = process.env.SMTP_HOST;
        const from = process.env.MAIL_FROM;
        const port = Number(process.env.SMTP_PORT ?? 587) || 587;
        const secure = process.env.SMTP_SECURE !== undefined
            ? process.env.SMTP_SECURE === "true"
            : port === 465;
        const user = process.env.SMTP_USER;
        const pass = process.env.SMTP_PASS;
        // Holder object: the session is created inside the timed closure,
        // and the finally below must be able to close it.
        const holder = { session: null };
        try {
            return await withTimeout((async () => {
                const socket = await connectSocket(host, port, secure);
                const session = new SmtpSession(socket);
                holder.session = session;
                const greeting = await session.readReply();
                if (greeting.code !== 220)
                    throw new Error(`smtp_unexpected_${greeting.code}`);
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
                if (dataReply.code !== 250)
                    throw new Error(`smtp_unexpected_${dataReply.code}`);
                try {
                    await session.command("QUIT", [221]);
                }
                catch {
                    // The message already landed; a rude goodbye is not a failure.
                }
                return { status: "sent" };
            })());
        }
        catch (err) {
            // Reason carries the failure CLASS only — never the message, the
            // recipient beyond what the caller already knows, or a code.
            return { status: "failed", reason: err instanceof Error ? err.message : "smtp_failed" };
        }
        finally {
            holder.session?.close();
        }
    }
}
exports.SmtpMailer = SmtpMailer;
// ---------------------------------------------------------------------------
// Recording stub — tests only. Remembers every message verbatim so the
// suite can read the issued code back out of the "email" and drive the
// full lifecycle. Never touches the network.
// ---------------------------------------------------------------------------
class RecordingMailer {
    name = "recording";
    messages = [];
    isConfigured() {
        return true;
    }
    async send(message) {
        this.messages.push(message);
        return { status: "sent" };
    }
}
exports.RecordingMailer = RecordingMailer;
// ---------------------------------------------------------------------------
/** Unwired-environment mailer: reports not_configured, sends nothing. */
class UnconfiguredMailer {
    name = "unconfigured";
    isConfigured() {
        return false;
    }
    async send() {
        return { status: "not_configured" };
    }
}
exports.UnconfiguredMailer = UnconfiguredMailer;
/** The production mailer for the current environment. */
function getMailer() {
    return isMailConfigured() ? new SmtpMailer() : new UnconfiguredMailer();
}
