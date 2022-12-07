import { bootstrap } from './app/module.js'

bootstrap().catch((error) => {
  console.error('Startup error', error)
})
