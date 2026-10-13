/// <reference types="vite/client" />

import type { LumenApi } from '../main/preload.cjs'

declare global {
  interface Window {
    lumen: LumenApi
  }
}

export {}