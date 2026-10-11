/// <reference types="vite/client" />

import type { LumenApi } from '../main/preload.js'

declare global {
  interface Window {
    lumen: LumenApi
  }
}

export {}