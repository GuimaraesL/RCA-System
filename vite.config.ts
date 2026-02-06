import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      }
    },
    // Otimização de Build: Separação de chunks para melhor caching
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            // Separa bibliotecas de vendor em chunks próprios
            'vendor-react': ['react', 'react-dom'],
            'vendor-charts': ['recharts'],
            'vendor-icons': ['lucide-react'],
          }
        }
      }
    }
  };
});
