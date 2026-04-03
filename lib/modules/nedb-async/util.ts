export function promisefy<T>(name: string, args: any[]): Promise<T[] | T> {
  return new Promise((rs, rj) => {
    /**
     * Check if the last argument is
     * an Array.
     * I choose array because all Nedb
     * parameters are objects.
     */
    const arg = [...args]
    if (Array.isArray(arg[arg.length - 1])) {
      const modifies = arg.pop()
      /**
       * nedb methods like
       * find, count, and findOne
       * returns cursor when a
       * callback is not passed
       * to them.
       */
      const cursor = (this as any)[name](...arg)
      let count = 1

      for (const [method, value] of modifies) {
        const valid = ['sort', 'limit', 'skip']
        if (!valid.includes(method)) {
          throw new Error(
            `${method} is not recognized, available methods are ${valid.join(',')}`
          )
        }
        if (typeof method !== 'string') {
          throw new Error(
            `${method} must be a type of string, available methods are ${valid.join(',')}`
          )
        }
        // call exec method if it's the last
        if (count === arg.length) {
          cursor[method](value).exec((err: any, docs: any) =>
            err ? rj(err) : rs(docs)
          )
        } else {
          cursor[method](value)
        }
        count++
      }
    } else {
      ;(this as any)[name](...arg, (err: any, docs: any) =>
        err ? rj(err) : rs(docs)
      )
    }
  })
}
export function justPromise(name: string, args: any[]) {
  return new Promise((rs, rj) => {
    ;(this as any)[name](...args, (err: any, docs: any) => {
      if (err) {
        rj(err)
      } else {
        rs(docs)
      }
    })
  })
}
