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
    permissions: ['storage', 'scripting'],
    host_permissions: ['<all_urls>'],
    icons: {
      16: '/icon/16.png',
      32: '/icon/32.png',
      48: '/icon/48.png',
      128: '/icon/128.png',
    },
    action: {
      default_popup: 'popup/index.html',
      default_title: 'Archify',
      default_icon: {
        16: '/icon/16.png',
        32: '/icon/32.png',
      },
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
