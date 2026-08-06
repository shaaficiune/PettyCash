/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_BACKEND_URL?: string;
  readonly VITE_SERVER_IP?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
