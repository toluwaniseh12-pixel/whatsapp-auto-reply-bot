const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason
} = require("@whiskeysockets/baileys");

const P = require("pino");
const QRCode = require("qrcode");
const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;

let currentQR = null;
let whatsappConnected = false;

app.get("/", async (req, res) => {
  if (whatsappConnected) {
    return res.send(`
      <html>
        <body style="font-family:Arial;text-align:center;padding:40px">
          <h1>WhatsApp Bot</h1>
          <h2>✅ WhatsApp is connected</h2>
          <p>Your bot is ready.</p>
        </body>
      </html>
    `);
  }

  if (!currentQR) {
    return res.send(`
      <html>
        <body style="font-family:Arial;text-align:center;padding:40px">
          <h1>WhatsApp Bot</h1>
          <h2>⏳ Waiting for QR code...</h2>
          <p>Refresh this page in a few seconds.</p>
        </body>
      </html>
    `);
  }

  const qrImage = await QRCode.toDataURL(currentQR);

  res.send(`
    <html>
      <head>
        <meta http-equiv="refresh" content="10">
        <title>WhatsApp Bot QR</title>
      </head>
      <body style="font-family:Arial;text-align:center;padding:30px">
        <h1>Connect WhatsApp</h1>
        <p>Open WhatsApp → Linked Devices → Link a Device</p>
        <img src="${qrImage}" style="width:320px;height:320px">
        <p>QR refreshes automatically.</p>
      </body>
    </html>
  `);
});

app.get("/health", (req, res) => {
  res.json({
    bot: "WhatsApp Auto Reply Bot",
    status: "online",
    whatsapp: whatsappConnected ? "connected" : "waiting"
  });
});

app.listen(PORT, () => {
  console.log(`Web server running on port ${PORT}`);
});

async function startBot() {
  const { state, saveCreds } =
    await useMultiFileAuthState("auth_info");

  const sock = makeWASocket({
    auth: state,
    logger: P({ level: "silent" })
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async ({
    connection,
    lastDisconnect,
    qr
  }) => {

    if (qr) {
      currentQR = qr;
      whatsappConnected = false;
      console.log("New WhatsApp QR code generated.");
    }

    if (connection === "open") {
      currentQR = null;
      whatsappConnected = true;
      console.log("WhatsApp connected successfully!");
    }

    if (connection === "close") {
      whatsappConnected = false;

      const statusCode =
        lastDisconnect?.error?.output?.statusCode;

      if (statusCode !== DisconnectReason.loggedOut) {
        console.log("Connection closed. Reconnecting...");
        setTimeout(startBot, 3000);
      } else {
        console.log("WhatsApp was logged out.");
      }
    }
  });

  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0];

    if (!msg.message || msg.key.fromMe) return;

    const sender = msg.key.remoteJid;

    console.log("Message received from:", sender);

    await sock.sendMessage(sender, {
      text: "Hello! 👋 Thanks for your message. I will get back to you shortly."
    });
  });
}

startBot();
