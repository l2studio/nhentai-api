/* eslint-disable no-unused-vars */

import { NHentaiAPI } from '../src'

const debug = require('debug')('lgou2w:nhentai-api-test')
const useProxy = false

const nhentai = new NHentaiAPI({
  proxy: useProxy ? { host: '127.0.0.1', port: 10809 } : undefined
})

;(async () => {
  nhentai.fetchAll().then(debug)
})().catch((err) => {
  debug(err)
  process.exit(-1)
})
