import type { Gallery, Galleries, Image, ImageName, ImageType, ImageSuffix } from './type'
import type { Duplex } from 'stream'
import { httpsOverHttp, httpOverHttp } from 'tunnel'
import got from 'got'

const debug = require('debug')('lgou2w:nhentai-api')
const DEFAULT_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36'

export const URL = {
  BASE: 'https://nhentai.net',
  API: 'https://nhentai.net/api',
  IMAGE: 'https://i.nhentai.net',
  THUMB: 'https://t.nhentai.net'
}

/** @deprecated Use IMAGE_SUFFIX_TYPES record table. Will be removed in v0.3.0 */
export const IMAGE_TYPE_TRANSFORM = (input: ImageType | ImageSuffix): ImageSuffix => {
  const v = IMAGE_SUFFIX_TYPES[input]
  if (!v) throw new Error('Unsupported image type transform：' + input)
  return v
}

export const IMAGE_SUFFIX_TYPES: Record<ImageType | ImageSuffix, ImageSuffix> = {
  j: 'jpg',
  jpg: 'jpg',
  p: 'png',
  png: 'png',
  g: 'gif',
  gif: 'gif'
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
      hooks: debug.enabled
        ? {
            beforeRequest: [
              options => {
                debug('FETCH -> %s %s', options.method.toUpperCase(), options.url.toString())
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
    debug('Fetch %d gallery data...', id)
    return this._fetch(`${URL.API}/gallery/${id}`)
      .json<Gallery>()
      .then((g) => fixGallery(g) as Gallery)
      .catch(this.errorHandler)
  }

  fetchRelated (id: number): Promise<Gallery[]> {
    debug('Fetch %d related gallery data...', id)
    return this._fetch(`${URL.API}/gallery/${id}/related`)
      .json<{ result: Gallery[] }>()
      .then((data) => fixGallery(data.result) as Gallery[])
      .catch(this.errorHandler)
  }

  fetchAll (page?: number): Promise<Galleries> {
    page = page || 1
    debug('Fetch gallery data on page %d...', page)
    return this._fetch(`${URL.API}/galleries/all`, { searchParams: { page } })
      .json<Galleries>()
      .then(fixGalleries)
      .catch(this.errorHandler)
  }

  search (query: string, page?: number): Promise<Galleries> {
    page = page || 1
    debug('Search gallery data on page %d of %s', page, query)
    return this._fetch(`${URL.API}/galleries/search`, { searchParams: { query, page } })
      .json<Galleries>()
      .then(fixGalleries)
      .catch(this.errorHandler)
  }

  searchByTag (tagId: number, page?: number): Promise<Galleries> {
    page = page || 1
    debug('Search gallery data on page %d of tag %d', page, tagId)
    return this._fetch(`${URL.API}/galleries/tagged`, { searchParams: { tag_id: tagId, page } })
      .json<Galleries>()
      .then(fixGalleries)
      .catch(this.errorHandler)
  }

  stringifyImageUrl (
    galleryMediaId: Gallery | number,
    imageName: ImageName,
    imageSuffix: Image | ImageType | ImageSuffix,
    isPreview?: boolean
  ): string {
    isPreview = isPreview || false
    const mediaId = typeof galleryMediaId === 'object' ? galleryMediaId.media_id : galleryMediaId
    if (typeof imageName === 'number' && imageName < 1) throw new Error('Invalid image name index, should be greater than 0')
    if (isNaN(mediaId) || mediaId <= 0) throw new Error('Invalid gallery media ID value: ' + mediaId)
    const url = typeof imageName === 'number' && !isPreview ? URL.IMAGE : URL.THUMB
    const file = typeof imageName === 'string' && isPreview ? '1t' : isPreview ? imageName + 't' : imageName
    const extension = IMAGE_SUFFIX_TYPES[typeof imageSuffix === 'object' ? imageSuffix.t : imageSuffix]
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
        stream.once('error', reject)
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

function fixGallery (gallery: Gallery | Gallery[]): Gallery | Gallery[] {
  if (Array.isArray(gallery)) {
    for (const item of gallery) {
      typeof item.id === 'string' && (item.id = parseInt(item.id))
      typeof item.media_id === 'string' && (item.media_id = parseInt(item.media_id))
    }
  } else {
    typeof gallery.id === 'string' && (gallery.id = parseInt(gallery.id))
    typeof gallery.media_id === 'string' && (gallery.media_id = parseInt(gallery.media_id))
  }
  return gallery
}

function fixGalleries (galleries: Galleries): Galleries {
  fixGallery(galleries.result)
  return galleries
}
