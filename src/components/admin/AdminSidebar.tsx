"use client";

import Link from 'next/link';
import React from 'react';
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Pill,
  Star,
  Layers,
  Stethoscope,
  Newspaper,
  LogOut,
  ChevronRight,
  UserRoundCheck,
  BarChart3,
} from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import axiosClient from '@/lib/axiosClient';
import { toast } from 'sonner';
import { clearAuthSession } from '@/features/auth/utils/auth-storage';

const menuItems = [
  // { name: 'Tổng quan', icon: LayoutDashboard, path: '/admin' },
  { name: 'Thống kê', icon: BarChart3, path: '/admin/analytics' },
  { name: 'Bệnh nhân', icon: Users, path: '/admin/patients' },
  { name: 'Bác sĩ', icon: Stethoscope, path: '/admin/doctors' },
  { name: 'Lễ tân', icon: UserRoundCheck, path: '/admin/receptionists' },
  { name: 'Chuyên khoa', icon: Layers, path: '/admin/chuyen-khoa' },
  { name: 'Lịch hẹn', icon: CalendarDays, path: '/admin/appointments' },
  { name: 'Thuốc', icon: Pill, path: '/admin/medicines' },
  { name: 'Đánh giá', icon: Star, path: '/admin/reviews' },
  { name: 'Tin tức', icon: Newspaper, path: '/admin/news' },
];

interface AdminSidebarProps {
  collapsed?: boolean;
  setCollapsed?: (v: boolean) => void;
}

export default function AdminSidebar({ collapsed, setCollapsed }: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isCollapsed = !!collapsed;

  const handleToggle = () => setCollapsed?.(!isCollapsed);

  const handleLogout = () => {
    if (typeof window === 'undefined') return;
    // Clears the session AND emits `auth-logout` so the shared sockets disconnect.
    clearAuthSession();

    // clear axios default auth header
    try {
      if (axiosClient && axiosClient.defaults && axiosClient.defaults.headers) {
        if (axiosClient.defaults.headers.common) delete axiosClient.defaults.headers.common.Authorization;
      }
    } catch (e) {
      // ignore
    }

    toast.success('Đã đăng xuất');
    router.push('/');
  };

  return (
    <aside
      className={cn(
        'admin-sidebar fixed top-0 left-0 h-screen z-50 flex flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-all duration-300 ease-in-out shadow-sm',
        isCollapsed ? 'w-20' : 'w-72'
      )}
    >
      <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 dark:bg-indigo-700 rounded-xl flex items-center justify-center flex-shrink-0">
            <LayoutDashboard className="w-6 h-6 text-white" />
          </div>
          {!isCollapsed && (
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Admin Panel</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">Management</p>
            </div>
          )}
        </div>
        <button
          onClick={handleToggle}
          className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400"
        >
          <ChevronRight className={cn('w-5 h-5 transition-transform', isCollapsed ? 'rotate-180' : '')} />
        </button>
      </div>

      <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700">
        {menuItems.map((item) => {
          const isActive = pathname === item.path;
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.path}
              className={cn(
                'flex items-center gap-3 px-3 py-3 rounded-xl transition-all group relative',
                isActive
                  ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              )}
            >
              <div
                className={cn(
                  'w-10 h-10 flex items-center justify-center rounded-lg',
                  isActive
                    ? 'bg-indigo-100 dark:bg-indigo-800 text-indigo-700 dark:text-indigo-400'
                    : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300'
                )}
              >
                <Icon className="w-5 h-5" />
              </div>

              {!isCollapsed && (
                <>
                  <div className="flex-1">
                    <span className="font-medium text-sm">{item.name}</span>
                  </div>
                </>
              )}
            </Link>
          );
        })}
      </nav>

      <div className={cn('p-3 border-t border-gray-200 dark:border-gray-800', isCollapsed ? 'items-center justify-center' : '')}>
        {isCollapsed ? (
          <div className="flex justify-center py-2">
            <Image
              src="/assets/bs/bs-Minh.jpg"
              alt="Admin"
              width={40}
              height={40}
              className="rounded-full object-cover ring-2 ring-indigo-500"
            />
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-indigo-50 to-indigo-100 dark:from-indigo-900/30 dark:to-indigo-900/20">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">Quản trị viên</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">admin@gmail.com</p>
              </div>
            </div>

            <div className="mt-3 space-y-1">
              <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors">
                <LogOut className="w-4 h-4" />
                <span className="text-sm">Đăng xuất</span>
              </button>
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
