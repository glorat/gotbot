import Nedb from '@seald-io/nedb'
import { justPromise, promisefy } from './util'

export class AsyncNedb<G> extends Nedb<G> {
  constructor(pathOrOptions?: string | Nedb.DataStoreOptions | undefined) {
    super(pathOrOptions)
  }
  public asyncFind<T extends G>(...args: any[]) {
    return promisefy.call(this, 'find', args) as Promise<T[]>
  }
  public asyncCount(...args: any[]) {
    return promisefy.call(this, 'count', args)
  }

  public asyncFindOne<T extends G>(...args: any[]) {
    return promisefy.call(this, 'findOne', args) as Promise<T>
  }

  public asyncInsert<T extends G>(...args: any[]) {
    return justPromise.call(this, 'insert', args) as Promise<T>
  }

  public asyncUpdate(...args: any[]) {
    return justPromise.call(this, 'update', args)
  }

  public asyncRemove(...args: any[]) {
    return justPromise.call(this, 'remove', args)
  }

  public asyncEnsureIndex(...args: any[]) {
    return justPromise.call(this, 'ensureIndex', args) as Promise<void>
  }

  public asyncRemoveIndex(...args: any[]) {
    return justPromise.call(this, 'removeIndex', args) as Promise<void>
  }

  public asyncLoadDatabase() {
    return new Promise((resolve, reject) => {
      this.loadDatabase((err) => {
        err ? reject(err) : resolve(true)
      })
    })
  }
}
export default AsyncNedb
