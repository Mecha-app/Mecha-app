const nodemailer = require('nodemailer');
const t = nodemailer.createTransport({ service:'gmail', auth:{ user:process.env.GMAIL_USER, pass:process.env.GMAIL_APP_PASS } });
const base = b => `<div style="font-family:Arial;max-width:560px;margin:40px auto;background:#111;border-radius:8px;overflow:hidden"><div style="background:#E8232A;padding:24px;text-align:center;color:#fff;font-size:28px;font-weight:900;letter-spacing:8px">MECHA</div><div style="padding:32px;color:#aaa">${b}</div></div>`;
const sendEmail = async ({ to, subject, html }) => { try { await t.sendMail({ from:`"MECHA AI" <${process.env.GMAIL_USER}>`, to, subject, html }); } catch(e){ console.log('Email skipped:', e.message); } };
const welcomeEmail = name => base(`<h2 style="color:#fff">Welcome to MECHA, ${name}! 🚗</h2><p>Your AI car co-pilot is ready.</p>`);
const shopWelcome  = name => base(`<h2 style="color:#fff">${name} is live on MECHA! 🔧</h2><p>Drivers near you can now find your shop.</p>`);
const towWelcome   = name => base(`<h2 style="color:#fff">Welcome to MECHA Towing, ${name}! 🚛</h2><p>You will receive job requests automatically.</p>`);
const resetEmail   = (name,url) => base(`<h2 style="color:#fff">Reset your password, ${name}</h2><p><a href="${url}" style="background:#E8232A;color:#fff;padding:12px 28px;border-radius:4px;text-decoration:none;font-weight:700">Reset Password</a></p>`);
module.exports = { sendEmail, welcomeEmail, shopWelcome, towWelcome, resetEmail };
