/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Backend base URL, injected by Render at build time. Empty in local dev. */
  readonly VITE_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
