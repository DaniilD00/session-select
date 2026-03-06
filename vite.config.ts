import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import viteCompression from 'vite-plugin-compression';

import { ViteImageOptimizer } from 'vite-plugin-image-optimizer';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: '/',
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
    viteCompression({ algorithm: 'gzip', deleteOriginFile: false }),
    viteCompression({ algorithm: 'brotliCompress', ext: '.br', deleteOriginFile: false }),
    ViteImageOptimizer({
      png: {
        quality: 80,
      },
      jpeg: {
        quality: 80,
      },
      jpg: {
        quality: 80,
      },
      webp: {
        quality: 80,
      },
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-charts': ['recharts'],
          'vendor-three': ['three'],
          'vendor-ui': ['@radix-ui/react-dialog', '@radix-ui/react-popover', '@radix-ui/react-tooltip', '@radix-ui/react-accordion', '@radix-ui/react-tabs'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-i18n': ['i18next', 'react-i18next'],
        },
      },
    },
  },
}));
