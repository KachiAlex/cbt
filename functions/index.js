const functions = require('firebase-functions/v2/https');
const logger = require('firebase-functions/logger');
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

function createTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error('Missing SMTP env vars');
  }
  return nodemailer.createTransport({
    host,
    port,
    secure: false,
    auth: { user, pass }
  });
}

app.post('/contact', async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body || {};
    if (!name || !email || !message) return res.status(400).json({ error: 'Missing required fields' });

    const transporter = createTransporter();
    await transporter.sendMail({
      from: 'CBTProMax Website <no-reply@cbtpromax.com>',
      to: 'sales@cbtpromax.com',
      replyTo: email,
      subject: subject || 'New Contact Form Submission',
      text: [
        `Name: ${name}`,
        `Email: ${email}`,
        phone ? `Phone: ${phone}` : null,
        '',
        message
      ].filter(Boolean).join('\n')
    });

    res.json({ ok: true });
  } catch (err) {
    logger.error('Email send error (/contact):', err);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

app.post('/schedule-demo', async (req, res) => {
  try {
    const { name, school, email, phone, position, studentsCount, notes } = req.body || {};
    if (!name || !email || !school) return res.status(400).json({ error: 'Missing required fields' });

    const transporter = createTransporter();
    await transporter.sendMail({
      from: 'CBTProMax Website <no-reply@cbtpromax.com>',
      to: 'sales@cbtpromax.com',
      replyTo: email,
      subject: 'New Free Trial / Demo Request',
      text: [
        'New Free Trial / Demo Request',
        '',
        `Name: ${name}`,
        `School/Institution: ${school}`,
        `Email: ${email}`,
        phone ? `Phone: ${phone}` : null,
        position ? `Position: ${position}` : null,
        studentsCount ? `Approx. Students: ${studentsCount}` : null,
        notes ? '' : null,
        notes ? `Notes: ${notes}` : null
      ].filter(Boolean).join('\n')
    });

    res.json({ ok: true });
  } catch (err) {
    logger.error('Email send error (/schedule-demo):', err);
    res.status(500).json({ error: 'Failed to send request' });
  }
});

exports.webApi = functions.onRequest({ region: 'us-central1' }, app);
