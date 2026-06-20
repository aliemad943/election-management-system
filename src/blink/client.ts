import { createClient } from '@blinkdotnew/sdk';

export const blink = createClient({
  projectId: process.env.VITE_BLINK_PROJECT_ID || 'election-management-er5exgbw',
  publishableKey: process.env.VITE_BLINK_PUBLISHABLE_KEY || 'blnk_pk_5b47418b',
  authRequired: false,
  auth: { mode: 'managed' },
});
