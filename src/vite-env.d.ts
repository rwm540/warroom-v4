/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** آدرس پروژه Supabase (مثال: https://xxxx.supabase.co) */
  readonly VITE_SUPABASE_URL?: string;
  /** کلید عمومی anon پروژه Supabase */
  readonly VITE_SUPABASE_ANON_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module '*.jpg' {
  const src: string;
  export default src;
}

declare module '*.png' {
  const src: string;
  export default src;
}

declare module '*.svg' {
  const src: string;
  export default src;
}
