import { IncomingWebhook } from '@slack/webhook'

// La URL del webhook la obtienes en api.slack.com creando una app
const webhook = new IncomingWebhook(process.env.SLACK_WEBHOOK_URL)

export const sendSlackError = async (err, req) => {
  // Si no hay webhook configurado, no fallamos — solo avisamos
  if (!process.env.SLACK_WEBHOOK_URL) {
    console.warn('SLACK_WEBHOOK_URL no configurado')
    return
  }

  try {
    await webhook.send({
      text: '🚨 *Error 5XX en BildyApp*',
      attachments: [{
        color: 'danger',
        fields: [
          { title: 'Timestamp', value: new Date().toISOString(),         short: true },
          { title: 'Método',    value: req.method,                       short: true },
          { title: 'Ruta',      value: req.originalUrl,                  short: true },
          { title: 'Error',     value: err.message,                      short: false },
          { title: 'Stack',     value: `\`\`\`${err.stack}\`\`\``,      short: false }
        ]
      }]
    })
  } catch (slackErr) {
    // Si Slack falla, no queremos que rompa la app
    console.error('Error enviando a Slack:', slackErr.message)
  }
}