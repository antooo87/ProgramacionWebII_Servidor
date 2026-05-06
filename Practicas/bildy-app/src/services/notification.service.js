import { EventEmitter } from 'events';

const notificationEmitter = new EventEmitter();

    notificationEmitter.on('user:registered', (user) => {
  console.log(`Notification: New user registered: ${user.email}`)
})

notificationEmitter.on('user:verified', (user) => {
  console.log(`Usuario verificado: ${user.email}`)
})

notificationEmitter.on('user:invited', (user) => {
  console.log(`📨 Usuario invitado: ${user.email}`)
})

notificationEmitter.on('user:deleted', (user) => {
  console.log(`🗑️ Usuario eliminado: ${user.email}`)
})

export default notificationEmitter

