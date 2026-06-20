// https://nuxt.com/docs/api/configuration/nuxt-config

const ASSET_BASE_URL = 'https://assets.zhenhuang.tw/tlv'

export default defineNuxtConfig({
  modules: ['@nuxt/content'],
  devtools: { enabled: true },
  future: {
    // 決定專案要採用哪一個主版本的預設行為
    compatibilityVersion: 4,
  },
  // 鎖定 Nuxt 的功能時間點；未來如有破壞性變更，更新於此時點之後，將暫不套用該更新
  compatibilityDate: '2026-06-11',

  css: ['@picocss/pico/css/pico.classless.min.css', '~/assets/css/main.css'],

  app: {
    head: {
      htmlAttrs: { lang: 'zh-Hant-TW' },
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'color-scheme', content: 'light dark' },
      ],
      title: '雲端法條本',
      link: [
        {
          rel: 'apple-touch-icon',
          sizes: '180x180',
          href: `${ASSET_BASE_URL}/apple-touch-icon.png`,
        },
        {
          rel: 'icon',
          type: 'image/png',
          sizes: '32x32',
          href: `${ASSET_BASE_URL}/favicon-32x32.png`,
        },
        {
          rel: 'icon',
          type: 'image/png',
          sizes: '16x16',
          href: `${ASSET_BASE_URL}/favicon-16x16.png`,
        },
        {
          rel: 'manifest',
          href: `${ASSET_BASE_URL}/site.webmanifest`,
        },
      ],
    },
  },

  // 若採 nuxt generate 純靜態輸出，Cloudflare Pages 不需要特別設定 preset
  nitro: {
    prerender: {
      // 強制預渲染所有路由
      crawlLinks: true,
    },
  },
})
