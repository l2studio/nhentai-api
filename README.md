# L2 Studio - NHentai API

A library for [nhentai.net](https://nhentai.net) http web api

## Install

```shell
npm install --save @l2studio/nhentai-api
# or
pnpm i @l2studio/nhentai-api
```

## API

By default, the constructor does not need parameters.

```typescript
import { NHentaiAPI } from '@l2studio/nhentai-api'

class NHentaiAPI(opts?: Options)
```

### Options

```typescript
type Options = {
  timeout?: number    // http request timeout (optional)
  userAgent?: string  // http request User-Agent header (optional)
  proxy?: {           // http proxy (optional)
    host: string      //      proxy host (required)
    port: number      //      porxy port (required)
  }
}
```

### .fetch

```typescript
/**
 * Fetch gallery data from the given gallery id.
 * 
 * @param id - Gallery id
 * @return Gallery
 */
NHentaiAPI.prototype.fetch(id: number): Promise<Gallery>
```

### .fetchRelated

```typescript
/**
 * Fetch related gallery data from the given gallery id.
 * 
 * @param id - Gallery id
 * @return Gallery[]
 */
NHentaiAPI.prototype.fetchRelated(id: number): Promise<Gallery[]>
```

### .fetchAll

```typescript
/**
 * Fetch galleries data from the given page.
 * 
 * @param page - Number of pages (optional)
 * @return Galleries
 */
NHentaiAPI.prototype.fetchAll(page?: number): Promise<Galleries>
```

### .search

```typescript
/**
 * Search gallery data from the given query and page.
 * 
 * @param query - Search query value
 * @param page  - Number of pages (optional)
 * @return Galleries
 */
NHentaiAPI.prototype.search(query: string, page?: number): Promise<Galleries>
```

### .searchByTag

```typescript
/**
 * Search gallery data from the given tag id and page.
 * 
 * @param tagId - Gallery tag id
 * @param page  - Number of pages (optional)
 * @return Galleries
 */
NHentaiAPI.prototype.searchByTag(tagId: number, page?: number): Promise<Galleries>
```

### .stringifyImageUrl

```typescript
/**
 * Stringify the given gallery and image data into image url.
 * 
 * @param galleryMediaId - Gallery object or media id
 * @param imageName      - Gallery page number or cover and thumb
 * @param imageSuffix    - Gallery image or image type and suffix
 * @param isPreview      - Whether is a preview image (optional)
 * @return Stringify image url
 */
NHentaiAPI.prototype.stringifyImageUrl(
  galleryMediaId: Gallery | number,
  imageName: ImageName,
  imageSuffix: Image | ImageType | ImageSuffix,
  isPreview?: boolean
): string
```

### .fetchImage

```typescript
/**
 * Fetch image from the given gallery and image data.
 * 
 * @param galleryMediaId - Gallery object or media id
 * @param imageName      - Gallery page number or cover and thumb
 * @param imageSuffix    - Gallery image or image type and suffix
 * @param isPreview      - Whether is a preview image (optional)
 * @return {
 *   data: Duplex        - Got stream
 *   headers: any        - Response headers
 * }
 */
NHentaiAPI.prototype.fetchImage(
  galleryMediaId: Gallery | number,
  imageName: ImageName,
  imageSuffix: Image | ImageType | ImageSuffix,
  isPreview?: boolean
): Promise<{ data: Duplex, headers: any }>
```

### .fetchImageAsBuffer

```typescript
/**
 * Fetch image and as buffer from the given gallery and image data.
 * 
 * @param galleryMediaId - Gallery object or media id
 * @param imageName      - Gallery page number or cover and thumb
 * @param imageSuffix    - Gallery image or image type and suffix
 * @param isPreview      - Whether is a preview image (optional)
 * @return {
 *   data: Buffer        - Image buffer
 *   headers: any        - Response headers
 * }
 */
NHentaiAPI.prototype.fetchImageAsBuffer(
  galleryMediaId: Gallery | number,
  imageName: ImageName,
  imageSuffix: Image | ImageType | ImageSuffix,
  isPreview?: boolean
): Promise<{ data: Buffer, headers: any }>
```

## License

Apache-2.0

