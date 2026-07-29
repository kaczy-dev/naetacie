'use client';

/**
 * Multi-Channel Notification Center Modal.
 * Manages Push, Email, and SMS alert toggles alongside in-app notification history.
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, CheckCheck, Smartphone, Mail, ShieldAlert, Sparkles, ExternalLink } from 'lucide-react';
import {
  getStoredNotifications,
  markAllAsRead,
  AppNotification,
} from '@/lib/notifications/notificationCenter';
import { triggerHaptic } from '@/lib/utils';

export interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDark: boolean;
}

export function NotificationCenterModal({ isOpen, onClose, isDark }: NotificationCenterModalProps) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [channels, setChannels] = useState({
    push: true,
    email: true,
    sms: false,
  });

  useEffect(() => {
    if (isOpen) {
      setNotifications(getStoredNotifications());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleMarkAllRead = () => {
    triggerHaptic(10);
    setNotifications(markAllAsRead());
  };

  const toggleChannel = (key: keyof typeof channels) => {
    triggerHaptic(10);
    setChannels((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className={`w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] ${
            isDark ? 'bg-slate-900 text-slate-100 border border-slate-800' : 'bg-white text-slate-900 border border-slate-200'
          }`}
        >
          {/* Header */}
          <div className="p-4 border-b border-border/40 flex items-center justify-between bg-gradient-to-r from-blue-600/10 to-indigo-600/10">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-blue-500" />
              <h2 className="font-bold text-base md:text-lg">Centrum Powiadomień</h2>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white font-extrabold text-[10px]">
                  {unreadCount} nowe
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-full hover:bg-slate-500/20 text-slate-400 hover:text-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Multi-Channel Settings */}
          <div className="p-4 bg-muted/20 border-b border-border/30 text-xs">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
              Kanały Powiadomień (Multi-Channel)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: 'push', label: 'Web Push', icon: Bell },
                { key: 'email', label: 'E-mail', icon: Mail },
                { key: 'sms', label: 'SMS / WhatsApp', icon: Smartphone },
              ].map((item) => {
                const k = item.key as keyof typeof channels;
                const active = channels[k];
                const Icon = item.icon;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => toggleChannel(k)}
                    className={`p-2 rounded-xl border flex items-center gap-1.5 justify-center font-semibold transition-all cursor-pointer ${
                      active
                        ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                        : 'border-border/40 text-muted-foreground hover:bg-slate-500/10'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notification Inbox List */}
          <div className="p-4 overflow-y-auto space-y-3 flex-1 text-xs">
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-muted-foreground">Ostatnie zawiadomienia</span>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-blue-500 hover:underline flex items-center gap-1 font-semibold text-[11px]"
                >
                  <CheckCheck className="w-3.5 h-3.5" /> Oznacz jako przeczytane
                </button>
              )}
            </div>

            {notifications.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">Brak powiadomień.</div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  className={`p-3 rounded-xl border transition-all ${
                    !item.read
                      ? isDark
                        ? 'bg-blue-950/30 border-blue-800/60'
                        : 'bg-blue-50/80 border-blue-200'
                      : 'border-border/30 bg-muted/10 opacity-75'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="font-bold text-xs flex items-center gap-1.5">
                      {!item.read && <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />}
                      {item.title}
                    </h3>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-muted-foreground leading-relaxed text-[11px]">{item.message}</p>
                  {item.linkUrl && (
                    <a
                      href={item.linkUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-blue-500 hover:underline font-bold text-[11px]"
                    >
                      Zobacz ofertę <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-border/40 text-center text-[11px] text-muted-foreground bg-muted/20">
            Alerta przesyłane są automatycznie dla nowych ofert w promieniu Szczecina.
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
