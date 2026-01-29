'use client';

import { useEffect } from 'react';

export default function ClientWrapper({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Handle browser extension attributes that cause hydration mismatches
    const body = document.body;
    
    // Remove common extension attributes that cause hydration issues
    const extensionAttributes = [
      'cz-shortcut-listen',
      'data-new-gr-c-s-check-loaded',
      'data-gr-ext-installed',
      'spellcheck',
    ];
    
    extensionAttributes.forEach(attr => {
      if (body.hasAttribute(attr)) {
        body.removeAttribute(attr);
      }
    });
  }, []);

  return <>{children}</>;
}
