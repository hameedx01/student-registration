import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (/\/(viem|ox|abitype|@noble|@scure|@adraffy|wagmi|@wagmi|@tanstack)\//.test(id))
            return 'web3';
          if (/\/(react|react-dom|scheduler)\//.test(id)) return 'react';
        },
      },
    },
  },
});
