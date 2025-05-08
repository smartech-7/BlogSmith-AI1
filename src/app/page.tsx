
'use client';

import React, { useState, useEffect } from 'react';
import { ContentGenerator } from '@/components/content-generator';
import { Header } from '@/components/header';

export default function Home() {
  const [currentYear, setCurrentYear] = useState<number | null>(null);

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <ContentGenerator />
      </main>
      <footer className="py-6 text-center text-sm text-muted-foreground">
        {currentYear !== null ? `© ${currentYear} BlogSmith AI. All rights reserved.` : '© BlogSmith AI. All rights reserved.'}
      </footer>
    </div>
  );
}
