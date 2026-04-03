// an implementation of NetworkInterface using the native browser fetch functionality
import { NetworkInterface } from './NetworkInterface'

function btoa(str: string): string {
  return Buffer.from(str).toString('base64')
}

export class NetworkFetch implements NetworkInterface {
  _weirdUrlify(form: any): string {
    // Arrays on DB's severs don't work with the usual "ids=1,2", they need the special "ids[]=1&ids[]=2" form
    const searchParams: URLSearchParams = new URLSearchParams()
    for (const prop of Object.keys(form)) {
      if (Array.isArray(form[prop])) {
        form[prop].forEach((entry: any): void => {
          searchParams.append(prop + '[]', entry)
        })
      } else {
        searchParams.set(prop, form[prop])
      }
    }

    return searchParams.toString()
  }

  async post(
    uri: string,
    form: any,
    bearerToken: string | undefined = undefined,
    getjson: boolean = true
  ): Promise<any> {
    const headers: any = {
      'Content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
    }

    if (bearerToken !== undefined) {
      headers.Authorization = 'Bearer ' + btoa(bearerToken)
    }

    console.log(`POST: ${uri}`)

    const response = await fetch(uri, {
      method: 'post',
      headers: headers,
      body: this._weirdUrlify(form),
    })

    if (response.ok) {
      if (getjson) {
        return response.json()
      } else {
        return response.text()
      }
    } else {
      const data = await response.text()
      throw new Error(
        `Network error; status ${response.status}; reply ${data}.`
      )
    }
  }

  async get(uri: string, qs: any, json: boolean = true): Promise<any> {
    let uriFetch

    if (qs) {
      uriFetch = uri + '?' + this._weirdUrlify(qs)
    } else {
      uriFetch = uri
    }
    console.log(`GET:  ${uriFetch}`)

    const response = await fetch(uriFetch)

    if (response.ok) {
      if (json) {
        return response.json()
      } else {
        return response.text()
      }
    } else {
      const data = await response.text()
      throw new Error(
        `Network error; status ${response.status}; reply ${data}.`
      )
    }
  }

  async postjson(uri: string, form: any): Promise<any> {
    const headers: any = {
      'Content-type': 'application/json',
    }

    const response = await fetch(uri, {
      method: 'post',
      headers: headers,
      body: JSON.stringify(form),
    })

    return response
  }
}
