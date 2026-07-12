'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

/**
 * Custom 404 page — branded, helpful, with a clear path back.
 */
export default function NotFound() {
  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-6 bg-background">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-sm"
      >
        <motion.div
          className="text-6xl mb-4"
          animate={{ rotate: [0, -10, 10, -5, 0] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 4 }}
        >
          🏗️
        </motion.div>
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Strona nie znaleziona
        </h1>
        <p className="text-muted-foreground text-sm mb-6">
          Ta strona nie istnieje lub została przeniesiona.
          Może szukasz ofert pracy?
        </p>
        <div className="flex flex-col gap-2">
          <Link href="/">
            <Button className="w-full">Przeglądaj oferty</Button>
          </Link>
          <Link href="/login">
            <Button variant="outline" className="w-full">Zaloguj się</Button>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
