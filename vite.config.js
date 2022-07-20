import legacy from '@vitejs/plugin-legacy';

export default {
  base: '/ms-cleaner/',
  server: {
    host: true,
  },
  plugins: [
    legacy({
      targets: ['defaults', 'ie >= 10'],
    }),
  ],
};
