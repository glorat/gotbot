declare module 'cheerio' {
  export interface CheerioAPI {
    (selector: string): Cheerio
    (selector: string, context: any): Cheerio
    (element: Cheerio): Cheerio
    (): Cheerio
    load(html: string | Buffer, options?: any): CheerioAPI
    text(): string
    html(): string | null
    attr(name: string): string | undefined
    find(selector: string): Cheerio
    filter(callback: (index: number, element: any) => boolean): Cheerio
    filter(selector: string): Cheerio
    each(callback: (index: number, element: any) => void): Cheerio
    map(callback: (index: number, element: any) => any): any[]
    first(): Cheerio
    eq(index: number): Cheerio
    contents(): Cheerio
    next(selector?: string): Cheerio
    prev(selector?: string): Cheerio
    parent(selector?: string): Cheerio
    closest(selector: string): Cheerio
    children(selector?: string): Cheerio
    remove(): Cheerio
    text(): string
    html(): string | null
    attr(name: string): string | undefined
    data(name?: string): any
    val(): any
    prop(name: string): any
    has(selector: string): Cheerio
    is(selector: string): boolean
    addClass(className: string): Cheerio
    removeClass(className?: string): Cheerio
    toggleClass(className: string, toggle?: boolean): Cheerio
    hasClass(className: string): boolean
    css(property: string, value?: string | number): Cheerio | string
    append(...content: any[]): Cheerio
    prepend(...content: any[]): Cheerio
    after(...content: any[]): Cheerio
    before(...content: any[]): Cheerio
    replaceWith(content: any): Cheerio
    empty(): Cheerio
    clone(): Cheerio
    length: number
    [index: number]: any
  }

  export type Cheerio = CheerioAPI & {
    length: number
  }

  export function load(html: string | Buffer, options?: any): CheerioAPI

  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  export interface Root extends CheerioAPI {}
}
