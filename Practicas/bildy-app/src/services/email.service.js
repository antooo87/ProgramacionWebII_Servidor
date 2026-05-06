import nodemailer from 'nodemailer'

// El transporter es la conexión al servidor de email
// Mailtrap es ideal para desarrollo — captura los emails sin mandarlos de verdad
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,     // smtp.mailtrap.io
  port: process.env.EMAIL_PORT,     // 587
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
})

export const sendVerificationEmail = async (to, code) => {
  await transporter.sendMail({
    from:    `"BildyApp" <no-reply@bildyapp.com>`,
    to,
    subject: 'Verifica tu cuenta en BildyApp',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px;">
        <h2>Bienvenido a BildyApp</h2>
        <p>Tu código de verificación es:</p>
        <h1 style="letter-spacing: 8px; color: #333;">${code}</h1>
        <p>Introduce este código en la app para activar tu cuenta.</p>
        <p>Caduca en 24 horas.</p>
      </div>
    `
  })
}