import { IncomingWebhook } from '@slack/webhook'

export const sendSlackError = async (err, req) => {
  if (!process.env.SLACK_WEBHOOK_URL) {
    console.warn('SLACK_WEBHOOK_URL no configurado')
    return
  }

  try {
    const webhook = new IncomingWebhook(process.env.SLACK_WEBHOOK_URL)
    await webhook.send({
      text: '🚨 *Error 5XX en BildyApp*',
      attachments: [{
        color: 'danger',
        fields: [
          { title: 'Timestamp', value: new Date().toISOString(),    short: true },
          { title: 'Método',    value: req.method,                  short: true },
          { title: 'Ruta',      value: req.originalUrl,             short: true },
          { title: 'Error',     value: err.message,                 short: false },
          { title: 'Stack',     value: `\`\`\`${err.stack}\`\`\``, short: false }
        ]
      }]
    })
  } catch (slackErr) {
    console.error('Error enviando a Slack:', slackErr.message)
  }
}