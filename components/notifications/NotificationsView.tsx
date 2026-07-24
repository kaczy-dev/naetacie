'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Flame, MapPin, DollarSign, CheckCheck, Trash2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  category: 'urgent' | 'distance' | 'salary' | 'general';
  timestamp: string;
  read: boolean;
}

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'n1',
    title: '🔥 Nowa wysoka stawka w Twojej branży',
    body: 'Spawacz TIG w Szczecinie (Prawobrzeże) z oferowaną stawką 9 500 PLN/mies.',
    category: 'urgent',
    timestamp: '10 minut temu',
    read: false,
  },
  {
    id: 'n2',
    title: '📍 Nowa oferta w promieniu 3 km od domu',
    body: 'Kierowca Kat. C+E – szybki proces rekrutacji (Pogodno).',
    category: 'distance',
    timestamp: '1 godz. temu',
    read: false,
  },
  {
    id: 'n3',
    title: '💰 Nowa oferta powyżej 8 000 zł',
    body: 'Operator Obrabiarek CNC – Śródmieście Szczecin.',
    category: 'salary',
    timestamp: '3 godz. temu',
    read: true,
  },
];

export function NotificationsView() {
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [filterCategory, setFilterCategory] = useState<'all' | 'urgent' | 'distance' | 'salary'>('all');

  const filtered = filterCategory === 'all'
    ? notifications
    : notifications.filter((n) => n.category === filterCategory);

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const deleteNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-black text-foreground">Centrum Powiadomień</h2>
            <p className="text-xs text-muted-foreground">Alerty przestrzenne i powiadomienia na żywo</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={markAllAsRead} className="gap-1.5 text-xs font-semibold">
            <CheckCheck className="w-4 h-4 text-emerald-500" /> Odczytaj wszystkie
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 text-xs">
        <button
          onClick={() => setFilterCategory('all')}
          className={`px-3 py-1.5 rounded-full font-bold transition-all ${
            filterCategory === 'all'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'bg-muted/60 text-muted-foreground hover:bg-muted'
          }`}
        >
          Wszystkie ({notifications.length})
        </button>
        <button
          onClick={() => setFilterCategory('urgent')}
          className={`px-3 py-1.5 rounded-full font-bold transition-all flex items-center gap-1 ${
            filterCategory === 'urgent'
              ? 'bg-red-500 text-white shadow-sm'
              : 'bg-muted/60 text-muted-foreground hover:bg-muted'
          }`}
        >
          <Flame className="w-3.5 h-3.5" /> 🔥 Pilne
        </button>
        <button
          onClick={() => setFilterCategory('distance')}
          className={`px-3 py-1.5 rounded-full font-bold transition-all flex items-center gap-1 ${
            filterCategory === 'distance'
              ? 'bg-blue-500 text-white shadow-sm'
              : 'bg-muted/60 text-muted-foreground hover:bg-muted'
          }`}
        >
          <MapPin className="w-3.5 h-3.5" /> 📍 Wokół domu
        </button>
        <button
          onClick={() => setFilterCategory('salary')}
          className={`px-3 py-1.5 rounded-full font-bold transition-all flex items-center gap-1 ${
            filterCategory === 'salary'
              ? 'bg-emerald-500 text-white shadow-sm'
              : 'bg-muted/60 text-muted-foreground hover:bg-muted'
          }`}
        >
          <DollarSign className="w-3.5 h-3.5" /> 💰 &gt;8000 zł
        </button>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        <AnimatePresence>
          {filtered.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-12 text-center text-muted-foreground space-y-2 bg-card/40 rounded-2xl border border-border/40 p-6"
            >
              <Sparkles className="w-8 h-8 mx-auto text-primary opacity-40" />
              <p className="text-xs font-semibold">Brak nowych powiadomień w tej kategorii.</p>
            </motion.div>
          ) : (
            filtered.map((n) => (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className={`p-4 rounded-2xl border transition-all flex items-start justify-between gap-3 ${
                  n.read
                    ? 'bg-card/50 border-border/40 text-muted-foreground'
                    : 'bg-card border-primary/40 shadow-sm text-foreground ring-1 ring-primary/10'
                }`}
              >
                <div className="space-y-1">
                  <div className="font-bold text-sm text-foreground flex items-center gap-2">
                    {!n.read && <span className="w-2 h-2 rounded-full bg-primary animate-ping shrink-0" />}
                    <span>{n.title}</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{n.body}</p>
                  <div className="text-[10px] text-muted-foreground font-semibold pt-1">{n.timestamp}</div>
                </div>

                <button
                  onClick={() => deleteNotification(n.id)}
                  className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-accent rounded-lg transition-colors"
                  title="Usuń powiadomienie"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
