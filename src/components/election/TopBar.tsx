'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, Bell, Settings, Map, Menu, LogOut, Shield, User, Key, Users } from 'lucide-react';
import type { PageId } from './Sidebar';

interface TopBarProps {
  onMenuToggle: () => void;
  isOwner?: boolean;
  onOwnerPanelOpen?: () => void;
  onLogout?: () => void;
  onPageChange?: (page: PageId) => void;
}

interface SearchResults {
  voters: any[];
  keys: any[];
  tribes: any[];
}

export default function TopBar({ onMenuToggle, isOwner, onOwnerPanelOpen, onLogout, onPageChange }: TopBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults>({ voters: [], keys: [], tribes: [] });
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    if (query.trim().length < 2) {
      setResults({ voters: [], keys: [], tribes: [] });
      setLoading(false);
      return;
    }

    setLoading(true);
    const delayDebounceFn = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data);
          setShowDropdown(true);
        }
      } catch (err) {
        console.error('Error during global search:', err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  const handleResultClick = (type: 'voter' | 'key' | 'tribe', item: any) => {
    setShowDropdown(false);
    setQuery('');

    // Determine target page
    let pageId: PageId = 'dashboard';
    if (type === 'voter') pageId = 'voters';
    else if (type === 'key') pageId = 'electoral-keys';
    else if (type === 'tribe') pageId = 'tribes';

    // 1. Navigate to page
    if (onPageChange) {
      onPageChange(pageId);
    }

    // 2. Dispatch event with detail so page can filter/focus
    setTimeout(() => {
      const event = new CustomEvent('global-search-select', {
        detail: {
          type,
          id: item.id,
          fullName: item.fullName || item.name,
          name: item.name || item.fullName,
        }
      });
      window.dispatchEvent(event);
    }, 100);
  };

  return (
    <header className="fixed top-0 left-0 w-full z-30 flex justify-between items-center px-4 h-12 bg-el-surface border-b border-el-outline-variant md:pr-64">
      <div className="flex items-center gap-4 w-full justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={onMenuToggle}
            className="md:hidden text-el-on-surface-variant hover:bg-el-surface-container-high transition-colors p-1 rounded cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="text-[24px] leading-[32px] font-semibold text-el-primary truncate hidden sm:block">
            منصة إدارة الماكينة الانتخابية - ذي قار
          </span>
        </div>

        <div className="flex items-center gap-4">
          {/* Global Filters */}
          <div className="hidden lg:flex items-center gap-2 ml-4">
            <div className="relative">
              <select className="appearance-none bg-el-surface-container border border-el-outline-variant text-el-on-surface text-[12px] leading-[16px] rounded pl-8 pr-3 py-1 h-8 focus:outline-none focus:border-el-primary cursor-pointer">
                <option>ذي قار</option>
              </select>
              <Map className="absolute left-2 top-1.5 text-el-on-surface-variant w-4 h-4 pointer-events-none" />
            </div>
            <div className="relative">
              <select className="appearance-none bg-el-surface-container border border-el-outline-variant text-el-on-surface text-[12px] leading-[16px] rounded pl-8 pr-3 py-1 h-8 focus:outline-none focus:border-el-primary cursor-pointer">
                <option>جميع الأقضية</option>
                <option>الناصرية</option>
                <option>الشطرة</option>
                <option>سوق الشيوخ</option>
                <option>الرفاعي</option>
                <option>قلعة سكر</option>
                <option>عشيرة</option>
                <option>البطحاء</option>
              </select>
              <Map className="absolute left-2 top-1.5 text-el-on-surface-variant w-4 h-4 pointer-events-none" />
            </div>
          </div>

          {/* Search */}
          <div className="hidden md:flex relative" ref={dropdownRef}>
            <Search className="absolute right-2 top-1/2 -translate-y-1/2 text-el-outline w-4 h-4" />
            <input
              className="pl-3 pr-8 py-1 rounded bg-el-surface-container-low border border-el-outline-variant text-[12px] leading-[16px] h-8 w-64 focus:ring-el-primary focus:border-el-primary"
              placeholder="البحث السريع..."
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
            />
            
            {showDropdown && (query.trim().length >= 2) && (
              <div className="absolute top-10 right-0 w-80 bg-el-surface-container-lowest border border-el-outline-variant rounded shadow-lg z-50 max-h-96 overflow-y-auto p-2 space-y-3">
                {loading && (
                  <div className="text-center text-el-on-surface-variant text-[11px] py-2">جاري البحث...</div>
                )}
                
                {!loading && results.voters.length === 0 && results.keys.length === 0 && results.tribes.length === 0 && (
                  <div className="text-center text-el-on-surface-variant text-[11px] py-2">لا توجد نتائج مطابقة</div>
                )}

                {/* Voters Section */}
                {results.voters.length > 0 && (
                  <div>
                    <h5 className="text-[10px] font-bold text-el-primary border-b border-el-outline-variant/60 pb-1 mb-1 px-1 flex items-center gap-1">
                      <User className="w-3 h-3" /> الناخبون
                    </h5>
                    <div className="space-y-0.5">
                      {results.voters.map((voter) => (
                        <button
                          key={voter.id}
                          onClick={() => handleResultClick('voter', voter)}
                          className="w-full text-right text-[11px] py-1 px-2 hover:bg-el-surface-container-high rounded transition-colors block text-el-on-surface"
                        >
                          <div className="font-semibold text-[12px]">{voter.fullName}</div>
                          <div className="text-[9px] text-el-on-surface-variant">{voter.district || 'الغراف'} · {voter.phone || 'بدون هاتف'}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Keys Section */}
                {results.keys.length > 0 && (
                  <div>
                    <h5 className="text-[10px] font-bold text-amber-600 border-b border-el-outline-variant/60 pb-1 mb-1 px-1 flex items-center gap-1">
                      <Key className="w-3 h-3" /> المفاتيح الانتخابية
                    </h5>
                    <div className="space-y-0.5">
                      {results.keys.map((key) => (
                        <button
                          key={key.id}
                          onClick={() => handleResultClick('key', key)}
                          className="w-full text-right text-[11px] py-1 px-2 hover:bg-el-surface-container-high rounded transition-colors block text-el-on-surface"
                        >
                          <div className="font-semibold text-[12px]">{key.fullName} ({key.keyCode})</div>
                          <div className="text-[9px] text-el-on-surface-variant">{key.district || 'الغراف'} · {key.phone || 'بدون هاتف'}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tribes Section */}
                {results.tribes.length > 0 && (
                  <div>
                    <h5 className="text-[10px] font-bold text-purple-600 border-b border-el-outline-variant/60 pb-1 mb-1 px-1 flex items-center gap-1">
                      <Users className="w-3 h-3" /> العشائر
                    </h5>
                    <div className="space-y-0.5">
                      {results.tribes.map((tribe) => (
                        <button
                          key={tribe.id}
                          onClick={() => handleResultClick('tribe', tribe)}
                          className="w-full text-right text-[11px] py-1 px-2 hover:bg-el-surface-container-high rounded transition-colors block text-el-on-surface"
                        >
                          <div className="font-semibold text-[12px]">{tribe.name}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <button className="text-el-on-surface-variant hover:bg-el-surface-container-high transition-colors p-1 rounded cursor-pointer active:opacity-80 relative">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-el-error rounded-full" />
          </button>
          <button className="text-el-on-surface-variant hover:bg-el-surface-container-high transition-colors p-1 rounded cursor-pointer active:opacity-80">
            <Settings className="w-5 h-5" />
          </button>

          {/* Owner Panel Button */}
          {isOwner && onOwnerPanelOpen && (
            <button
              onClick={onOwnerPanelOpen}
              className="text-amber-600 hover:bg-amber-50 transition-colors p-1 rounded cursor-pointer active:opacity-80"
              title="لوحة تحكم المالك"
            >
              <Shield className="w-5 h-5" />
            </button>
          )}

          {/* Logout Button */}
          {onLogout && (
            <button
              onClick={onLogout}
              className="text-el-on-surface-variant hover:bg-red-50 hover:text-red-600 transition-colors p-1 rounded cursor-pointer active:opacity-80"
              title="تسجيل خروج"
            >
              <LogOut className="w-5 h-5" />
            </button>
          )}

          <div className="w-8 h-8 rounded-full bg-el-primary-fixed flex items-center justify-center overflow-hidden border border-el-outline-variant">
            <div className="w-full h-full bg-el-primary-container text-el-on-primary-container flex items-center justify-center text-[12px] font-bold">
              {isOwner ? 'م' : 'ز'}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}