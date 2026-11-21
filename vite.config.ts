import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Relative assets work for both /repo-name/ Pages URLs and custom domains.
  base: './',
});
