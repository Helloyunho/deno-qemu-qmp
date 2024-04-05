import { makeJSONLIterator } from './utils.ts'

export class QMP {
  conn?: Deno.Conn
  id = 0

  async connect(options: Deno.ConnectOptions) {
    this.conn = await Deno.connect(options)
    const greeting: {
      QMP: { version: { package: string } }
    } = await this.waitFor({ timeout: 30000 }) // Wait for the welcome message
    if (greeting?.QMP.version.package) {
      return greeting.QMP.version.package
    }
  }

  close() {
    this.conn!.close()
  }

  get reader() {
    return makeJSONLIterator(this.conn!.readable)
  }

  waitFor({
    id,
    timeout
  }: // deno-lint-ignore no-explicit-any
  { id?: number; timeout?: number } = {}): Promise<any> {
    return new Promise((resolve, reject) => {
      let timeoutId: number | undefined
      if (timeout !== undefined) {
        timeoutId = setTimeout(() => {
          reject(new Error('Operation timed out'))
        }, timeout)
      }

      ;(async () => {
        for await (const msg of this.reader) {
          if (timeoutId === undefined && timeout) {
            break
          }
          if (id === undefined || msg.id === id) {
            if (timeoutId !== undefined) {
              clearTimeout(timeoutId)
            }
            if (msg.error) {
              reject(new Error(msg.error))
            } else if (msg.result) {
              resolve(msg.result)
            } else {
              resolve(msg)
            }
          }
        }
      })()
    })
  }

  // deno-lint-ignore no-explicit-any
  async send(execute: string, args: any) {
    const msg = { id: this.id++, execute, arguments: args }
    const encoder = new TextEncoder()
    await this.conn!.write(encoder.encode(JSON.stringify(msg) + '\n'))
    return msg.id
  }
}
