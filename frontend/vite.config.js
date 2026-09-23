const { defineConfig } = require('vitest/config');
const { transformWithOxc } = require('vite');
const react = require('@vitejs/plugin-react').default;

const transformJsxInJs = () => ({
  name: 'transform-jsx-in-js',
  enforce: 'pre',
  async transform(code, id) {
    if (!/[\\/]src[\\/].*\.js$/.test(id)) return null;
    const result = await transformWithOxc(code, id, {
      lang: 'jsx',
      jsx: { runtime: 'automatic', importSource: 'react' },
    });
    return { code: result.code, map: result.map };
  },
});

module.exports = defineConfig({
  plugins: [transformJsxInJs(), react({ include: /\.[jt]sx?$/ })],
  optimizeDeps: {
    noDiscovery: true,
    include: ['exceljs'],
  },
  server: {
    host: '0.0.0.0',
    port: 3001,
    proxy: {
      '/api': {
        target: 'http://162.35.104.28:8090',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'build',
    emptyOutDir: true,
    copyPublicDir: false,
  },
  test: {
    globals: true,
    environment: 'jsdom',
  },
});
