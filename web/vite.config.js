import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { createHtmlPlugin } from 'vite-plugin-html'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd())
  return {
    base: mode === 'development' ? '/': '/',
    plugins: [
      vue(),
      createHtmlPlugin({
        minify: true,
        /**
         * 闇€瑕佹敞鍏?index.html ejs 妯＄増鐨勬暟鎹?
         */
        inject: {
          data: {
            mode
          }
        }
      })
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      }
    },
    css: {
      preprocessorOptions: {
        less: {
          javascriptEnabled: true  //鍏佽鍦╨ess涓娇鐢↗avascript 琛ㄨ揪寮?
        }
      }
    },
    esbuild: {
      drop: mode === 'production'  ? ['console', 'debugger'] : []
    },
    server: {
      host: '0.0.0.0',
      port: 5173,
      open: false,
      // API 浠ｇ悊閰嶇疆锛氫粠鐜鍙橀噺 VITE_BACKEND_URL 璇诲彇
      proxy: {
        '/v1': {
          target: env.VITE_BACKEND_URL || 'http://localhost:3000',
          changeOrigin: true
        }
      }
    },
    build: {
      target: 'es2015',
      outDir: 'dist',
      assetsDir: 'assets', 
      sourcemap: false,
      minify: 'esbuild',
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/vant')) {
              return 'vant'
            }

            if (id.includes('node_modules/vue') || id.includes('node_modules/vue-router')) {
              return 'vue-vendor'
            }
          }
        }
      }
    }
  }
})


