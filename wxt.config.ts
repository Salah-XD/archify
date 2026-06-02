import { defineConfig } from 'wxt';
import tailwind from '@tailwindcss/vite';

export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-react'],
  vite: () => ({ plugins: [tailwind()] }),
  manifest: {
    name: 'Archify',
    description:
      'Understand any web application — architecture and client-side security, in your browser.',
    permissions: ['storage', 'scripting', 'activeTab'],
    host_permissions: ['<all_urls>'],
    action: {
      default_popup: 'popup/index.html',
      default_title: 'Archify',
    },
    web_accessible_resources: [{ resources: ['injected.js'], matches: ['<all_urls>'] }],
    commands: {
      'toggle-hover': {
        suggested_key: { default: 'Ctrl+Shift+H' },
        description: 'Toggle the Archify hover inspector',
      },
    },
  },
});
