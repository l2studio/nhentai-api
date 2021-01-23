import type { Gallery, Galleries, Image, ImageName, ImageType, ImageSuffix } from './type'
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

export const IMAGE_TYPE_TRANSFORM = (input: ImageType | ImageSuffix): ImageSuffix => {
  switch (input) {
    case 'jpg':
    case 'j':
      return 'jpg'
    case 'png':
    case 'p':
      return 'png'
    case 'gif':
    case 'g':
      return 'gif'
    default: throw new Error('不支持的图片类型转换：' + input)
  }
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

  constructor (opts?: Options) {
    opts = opts || {}
    this.req = axios.create({
      maxRedirects: 0,
      timeout: opts.timeout,
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

  stringifyImageUrl (
    galleryMediaId: Gallery | number,
    imageName: ImageName,
    imageSuffix: Image | ImageType | ImageSuffix,
    isPreview?: boolean
  ): string {
    isPreview = isPreview || false
    const mediaId = typeof galleryMediaId === 'object' ? parseInt(galleryMediaId.media_id) : galleryMediaId
    if (typeof imageName === 'number' && imageName < 1) throw new Error('无效的图片名字索引，应大于 0 值')
    if (isNaN(mediaId) || mediaId <= 0) throw new Error('无效的画廊媒体 ID 值：' + mediaId)
    const url = typeof imageName === 'number' && !isPreview ? URL.IMAGE : URL.THUMB
    const file = typeof imageName === 'string' && isPreview ? '1t' : isPreview ? imageName + 't' : imageName
    const extension = IMAGE_TYPE_TRANSFORM(typeof imageSuffix === 'object' ? imageSuffix.t : imageSuffix)
    return `${url}/galleries/${mediaId}/${file}.${extension}`
  }

  fetchImage (
    galleryMediaId: Gallery | number,
    imageName: ImageName,
    imageSuffix: Image | ImageType | ImageSuffix,
    isPreview?: boolean
  ): Promise<{ data: Readable, headers: any }> {
    const url = this.stringifyImageUrl(galleryMediaId, imageName, imageSuffix, isPreview)
    const host = (url.indexOf(URL.THUMB) !== -1 ? URL.THUMB : URL.IMAGE).substring(8) // https://
    return this.req
      .get<Readable>(url, { headers: { host }, responseType: 'stream' })
      .then((res) => ({ data: res.data, headers: res.headers }))
      .catch(this.errorHandler)
  }

  fetchImageAsBuffer (
    galleryMediaId: Gallery | number,
    imageName: ImageName,
    imageSuffix: Image | ImageType | ImageSuffix,
    isPreview?: boolean
  ): Promise<{ data: Buffer, headers: any }> {
    const fetchImage = this.fetchImage.bind(this)
    // eslint-disable-next-line no-async-promise-executor
    return new Promise(async (resolve, reject) => {
      try {
        const { data, headers } = await fetchImage(galleryMediaId, imageName, imageSuffix, isPreview)
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
