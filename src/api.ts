import type { Gallery, Galleries, Image, ImageName, ImageType, ImageSuffix } from './type'
import type { Duplex } from 'stream'
import { httpsOverHttp, httpOverHttp } from 'tunnel'
import got from 'got'

const debug = require('debug')('lgou2w:nhentai-api')
const isDebug = typeof process.env.DEBUG !== 'undefined'
const DEFAULT_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.104 Safari/537.36'

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
  userAgent: string
  proxy: {
    host: string
    port: number
  }
}>

export class NHentaiAPI {
  private readonly _fetch: typeof got

  constructor (opts?: Options) {
    opts = opts || {}
    this._fetch = got.extend({
      maxRedirects: 0,
      followRedirect: false,
      timeout: opts.timeout,
      agent: opts.proxy
        ? {
            http: httpOverHttp({ proxy: opts.proxy }),
            https: httpsOverHttp({ proxy: opts.proxy }) as any
          }
        : undefined,
      headers: { 'user-agent': opts.userAgent || DEFAULT_UA },
      hooks: isDebug
        ? {
            beforeRequest: [
              options => {
                const param = options.searchParams ? '?' + options.searchParams.toString() : ''
                debug('FETCH -> %s %s', options.method.toUpperCase(), options.url.toString() + param)
              }
            ]
          }
        : undefined
    })
  }

  private readonly errorHandler = (err: Error | any): Promise<never> => {
    debug(err)
    return Promise.reject(err)
  }

  fetch (id: number): Promise<Gallery> {
    debug('请求获取 %d 的画廊数据...', id)
    return this._fetch(`${URL.API}/gallery/${id}`)
      .json<Gallery>()
      .catch(this.errorHandler)
  }

  fetchRelated (id: number): Promise<Gallery[]> {
    debug('请求获取 %d 的相关画廊数据...', id)
    return this._fetch(`${URL.API}/gallery/${id}/related`)
      .json<{ result: Gallery[] }>()
      .then((data) => data.result)
      .catch(this.errorHandler)
  }

  fetchAll (page?: number): Promise<Galleries> {
    page = page || 1
    debug('请求获取第 %d 页的画廊数据...', page)
    return this._fetch(`${URL.API}/galleries/all`, { searchParams: { page } })
      .json<Galleries>()
      .catch(this.errorHandler)
  }

  search (query: string, page?: number): Promise<Galleries> {
    page = page || 1
    debug('请求搜索关键字 %s 的第 %d 页的画廊数据...', query, page)
    return this._fetch(`${URL.API}/galleries/search`, { searchParams: { query, page } })
      .json<Galleries>()
      .catch(this.errorHandler)
  }

  searchByTag (tagId: number, page?: number): Promise<Galleries> {
    page = page || 1
    debug('请求搜索标签 %d 的第 %d 页的画廊数据...', tagId, page)
    return this._fetch(`${URL.API}/galleries/tagged`, { searchParams: { tag_id: tagId, page } })
      .json<Galleries>()
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

  async fetchImage (
    galleryMediaId: Gallery | number,
    imageName: ImageName,
    imageSuffix: Image | ImageType | ImageSuffix,
    isPreview?: boolean
  ): Promise<{ data: Duplex, headers: any }> {
    const url = this.stringifyImageUrl(galleryMediaId, imageName, imageSuffix, isPreview)
    const host = (url.indexOf(URL.THUMB) !== -1 ? URL.THUMB : URL.IMAGE).substring(8) // https://
    // eslint-disable-next-line no-async-promise-executor
    return new Promise(async (resolve, reject) => {
      try {
        const stream = await this._fetch.stream(url, { headers: { host } })
        stream.once('response', (res) => {
          resolve({ data: stream, headers: res.headers })
        })
      } catch (e) {
        reject(e)
      }
    })
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
