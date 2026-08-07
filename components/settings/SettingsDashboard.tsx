'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Bell, Sliders } from 'lucide-react';
import { ProfileSettings } from '@/components/profile/ProfileSettings';
import { NotificationsView } from '@/components/notifications/NotificationsView';
import { cn, triggerHaptic } from '@/lib/utils';

export function SettingsDashboard() {
  const [subTab, setSubTab] = useState<'profile' | 'notifications'>('profile');

  const handleSubTabChange = (tab: 'profile' | 'notifications') => {
    triggerHaptic(10);
    setSubTab(tab);
  };

  return (
    <div className="min-h-screen bg-background pb-12">
      {/* Tab Selectors */}
      <div className="sticky top-12 md:top-0 z-40 bg-background/85 backdrop-blur-md border-b border-border/60 py-3 px-4">
        <div className="max-w-md mx-auto flex bg-accent/40 p-1 rounded-xl border border-border/40">
          <button
            onClick={() => handleSubTabChange('profile')}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer',
              subTab === 'profile'
                ? 'bg-card text-primary shadow-xs border border-border/50'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <User className="w-4 h-4" />
            <span>Profil i Opcje</span>
          </button>
          <button
            onClick={() => handleSubTabChange('notifications')}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer',
              subTab === 'notifications'
                ? 'bg-card text-primary shadow-xs border border-border/50'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Bell className="w-4 h-4" />
            <span>Powiadomienia</span>
          </button>
        </div>
      </div>

      {/* Render Sub Views */}
      <div className="mt-4">
        {subTab === 'profile' && <ProfileSettings />}
        {subTab === 'notifications' && <NotificationsView />}
      </div>
    </div>
  );
}
