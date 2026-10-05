import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],

    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },

    server: {
      port: 3002,
      strictPort: false,

      // Permite acesso através dos Quick Tunnels do Cloudflare
      allowedHosts: [
        '.trycloudflare.com',
      ],

      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',

      // Disable file watching when DISABLE_HMR is true
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});