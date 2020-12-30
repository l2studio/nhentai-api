import type { Gallery, Galleries } from './type'
import type { AxiosInstance, AxiosError } from 'axios'
import { httpsOverHttp, httpOverHttp } from 'tunnel'
import { stringify as qs } from 'querystring'
import axios from 'axios'

const debug = require('debug')('lgou2w:nhentai-api')
const isDebug = typeof process.env.DEBUG !== 'undefined'

export const URL = {
  BASE: 'https://nhentai.net',
  API: 'https://nhentai.net/api',
  IMAGE: 'https://i.nhentai.net',
  THUMB: 'https://t.nhentai.net'
}

export type Options = Partial<{
  timeout: number
  proxy: {
    host: string
    port: number
  }
}>

export class NHentaiAPI {
  private readonly req: AxiosInstance

  constructor (opts: Options) {
    this.req = axios.create({
      maxRedirects: 0,
      timeout: opts.timeout || 5000,
      httpsAgent: opts.proxy ? httpsOverHttp({ proxy: opts.proxy }) : undefined,
      httpAgent: opts.proxy ? httpOverHttp({ proxy: opts.proxy }) : undefined
    })
    if (isDebug) {
      this.req.interceptors.request.use((config) => {
        const param = config.params ? '?' + qs(config.params) : ''
        debug('AXIOS -> %s %s', config.method!.toUpperCase(), config.url + param)
        return config
      })
    }
  }

  private readonly errorHandler = (err: AxiosError | Error | any): Promise<never> => {
    debug(err)
    return Promise.reject(err)
  }

  fetch (id: number): Promise<Gallery> {
    debug('请求获取 %d 的画廊数据...', id)
    return this.req
      .get(`${URL.API}/gallery/${id}`)
      .then((res) => res.data)
      .catch(this.errorHandler)
  }

  fetchRelated (id: number): Promise<Gallery[]> {
    debug('请求获取 %d 的相关画廊数据...', id)
    return this.req
      .get(`${URL.API}/gallery/${id}/related`)
      .then((res) => res.data.result)
      .catch(this.errorHandler)
  }

  fetchAll (page?: number): Promise<Galleries> {
    page = page || 1
    debug('请求获取第 %d 页的画廊数据...', page)
    return this.req
      .get(`${URL.API}/galleries/all`, { params: { page } })
      .then((res) => res.data)
      .catch(this.errorHandler)
  }

  search (query: string, page?: number): Promise<Galleries> {
    page = page || 1
    debug('请求搜索关键字 %s 的第 %d 页的画廊数据...', query, page)
    return this.req
      .get(`${URL.API}/galleries/search`, { params: { query, page } })
      .then((res) => res.data)
      .catch(this.errorHandler)
  }

  searchByTag (tagId: number, page?: number): Promise<Galleries> {
    page = page || 1
    debug('请求搜索标签 %d 的第 %d 页的画廊数据...', tagId, page)
    return this.req
      .get(`${URL.API}/galleries/tagged`, { params: { tag_id: tagId, page } })
      .then((res) => res.data)
      .catch(this.errorHandler)
  }
}
