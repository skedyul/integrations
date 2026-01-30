import type MailgunNamespace = require('mailgun-js')

declare module 'mailgun.js' {
  export = MailgunNamespace
}
