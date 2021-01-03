import type { Gallery, Galleries, Image, ImageType } from './type'
import type { AxiosInstance, AxiosError } from 'axios'
import type { Readable } from 'stream'
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

  static readonly DEFAULT_IMAGE_TYPE_TRANSFORM = (type: ImageType) => {
    switch (type) {
      case 'j': return 'jpg'
      case 'p': return 'png'
      case 'g': return 'gif'
      default: throw new Error('不支持的图片类型转换：' + type)
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

  stringifyImageUrl (
    gallery: Gallery | number,
    name: number | 'cover' | 'thumb',
    image: Image | ImageType,
    isPreview?: boolean
  ): string {
    isPreview = isPreview || false
    const mediaId = typeof gallery === 'object' ? parseInt(gallery.media_id) : gallery
    if (typeof name === 'number' && name < 1) throw new Error('无效的图片名字索引，应大于 0 值')
    if (isNaN(mediaId) || mediaId <= 0) throw new Error('无效的画廊媒体 ID 值：' + mediaId)
    const url = typeof name === 'number' && !isPreview ? URL.IMAGE : URL.THUMB
    const file = typeof name === 'string' && isPreview ? '1t' : isPreview ? name + 't' : name
    const extension = NHentaiAPI.DEFAULT_IMAGE_TYPE_TRANSFORM(typeof image === 'object' ? image.t : image)
    return `${url}/galleries/${mediaId}/${file}.${extension}`
  }

  fetchImage (
    gallery: Gallery | number,
    name: number | 'cover' | 'thumb',
    image: Image | ImageType,
    isPreview?: boolean
  ): Promise<{ data: Readable, headers: any }> {
    const url = this.stringifyImageUrl(gallery, name, image, isPreview)
    const host = (url.indexOf(URL.THUMB) !== -1 ? URL.THUMB : URL.IMAGE).substring(8) // https://
    return this.req
      .get<Readable>(url, { headers: { host }, responseType: 'stream' })
      .then((res) => ({ data: res.data, headers: res.headers }))
      .catch(this.errorHandler)
  }

  fetchImageAsBuffer (
    gallery: Gallery | number,
    name: number | 'cover' | 'thumb',
    image: Image | ImageType,
    isPreview?: boolean
  ): Promise<{ data: Buffer, headers: any }> {
    const fetchImage = this.fetchImage.bind(this)
    // eslint-disable-next-line no-async-promise-executor
    return new Promise(async (resolve, reject) => {
      try {
        const { data, headers } = await fetchImage(gallery, name, image, isPreview)
        const buf: Buffer[] = []
        data.once('error', reject)
        data.on('data', (chunk: Buffer) => { buf.push(chunk) })
        data.on('end', () => { resolve({ data: Buffer.concat(buf), headers }) })
      } catch (e) {
        reject(e)
      }
    })
  }
}
