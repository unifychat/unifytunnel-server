/* eslint-disable no-console */
/* eslint-disable import/no-internal-modules */
import * as lib from './lib';

// POSIX compliant apps (with exit status)
switch (process.env.NODE_ENV) {
  case lib.Environment.test:
    (<() => Promise<void>>require('./test').main)()
      .then(() => {
        console.log(`⚡️ Unify.chat Tunnel TESTING v${lib.VERSION} started - ENV=${process.env.NODE_ENV} HOSTING=${process.env.HOSTING}!`);
        // process.exit(0);
      })
      .catch(err => {
        console.error(`⚠ Unify.chat Tunnel TESTING v${lib.VERSION} CRASHED - ENV=${process.env.NODE_ENV} HOSTING=${process.env.HOSTING}!`, err);
        process.exit(1);
      });
    break;
  case lib.Environment.development:
  case lib.Environment.production:
  default:
    (<() => Promise<void>>require('./app').main)()
      .then(() => {
        console.log(`⚡️ Unify.chat Tunnel Server v${lib.VERSION} started ${(!process.env.PORT ? 'SocketMode' : `port ${Number(process.env.PORT)}`)} - ENV=${process.env.NODE_ENV} HOSTING=${process.env.HOSTING}!`);
      })
      .catch(err => {
        console.error(`⚠ Unify.chat Tunnel Server v${lib.VERSION} CRASHED ${(!process.env.PORT ? 'SocketMode' : `port ${Number(process.env.PORT)}`)} - ENV=${process.env.NODE_ENV} HOSTING=${process.env.HOSTING}!`, err);
      })
    break;
}