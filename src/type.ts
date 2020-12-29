/* eslint-disable camelcase */

export type ImageType = 'j' | 'p' | 'g'

export interface Image {
  t: ImageType
  w: number
  h: number
}

export type TagType = 'tag' | 'category' | 'artist' | 'parody' | 'character' | 'group' | 'language'

export interface Tag {
  id: number
  type: TagType
  name: string
  url: string
  count: number
}

export interface Gallery {
  id: number
  media_id: string
  title: {
    english: string
    japanese?: string
    pretty?: string
  },
  images: {
    pages: Image[],
    cover: Image
    thumbnail: Image
  }
  scanlator: string
  upload_date: number
  tags: Tag[]
  num_pages: number
  num_favorites: number
}

export interface Galleries {
  result: Gallery[]
  num_pages: number
  per_page: number
}
