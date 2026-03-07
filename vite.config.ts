import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      proxy: {
        // Redireciona chamadas da API para o backend Node.js
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        },
        // Redireciona chamadas de IA para o serviço Python
        '/ai': {
          target: 'http://localhost:8000',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/ai/, ''),
        }
      }
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
    },
    test: {
      globals: true,
      environment: 'jsdom',
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json-summary'],
        reportsDirectory: './coverage'
      },
      include: [
        'src/**/__tests__/**/*.{test,spec}.{ts,tsx}',
        'src/**/*.{test,spec}.{ts,tsx}',
        'server/src/**/__tests__/**/*.{test,spec}.{ts,tsx}',
        'server/src/**/*.{test,spec}.{ts,tsx}'
      ],
      exclude: ['**/node_modules/**', '**/dist/**', 'tests/e2e/**'],
    }
  };
});
