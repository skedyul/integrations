declare module 'node:test' {
  export interface TestContext {
    name: string
    runOnly?: boolean
  }

  export function test(
    name: string,
    fn: (t: TestContext) => void | Promise<void>,
  ): void

  export { test as default }
}

declare module 'node:assert/strict' {
  import assert = require('assert')
  export = assert
}






