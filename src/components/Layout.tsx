"use client";

import React, { useState } from 'react';
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Target, Users, CheckSquare, DollarSign,
  FileText, Calculator, Calendar, Settings, Bell, GitBranch,
  LogOut, ShieldCheck, Menu, X
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Layout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const { user, profile, signOut } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
  };

  const getInitials = () => {
    if (user?.email) {
      return user.email.substring(0, 2).toUpperCase();
    }
    return "US";
  };

  const navItems = [
    { name: "Dashboard", path: "/", icon: LayoutDashboard },
    { name: "Oportunidades", path: "/oportunidades", icon: Target },
    { name: "Clientes", path: "/clientes", icon: Users },
    { name: "Tarefas", path: "/tarefas", icon: CheckSquare },
    { name: "Financeiro", path: "/financeiro", icon: DollarSign },
    { name: "Contratos", path: "/contratos", icon: FileText },
    { name: "Orçamentos", path: "/orcamentos", icon: Calculator },
    { name: "Agenda", path: "/agenda", icon: Calendar },
    { name: "Fluxo de Cadência", path: "/fluxo", icon: GitBranch },
    { name: "Configurações", path: "/configuracoes", icon: Settings },
  ];

  if (profile?.role === 'admin') {
    navItems.push({ name: "Administração", path: "/admin", icon: ShieldCheck });
  }

  const renderNavItems = (isMobile = false) => {
    return navItems.map((item) => {
      const isActive = location.pathname === item.path;
      const isAdminItem = item.path === "/admin";
      
      return (
        <Link
          key={item.name}
          to={item.path}
          onClick={() => isMobile && setIsMobileMenuOpen(false)}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium ${
            isActive
              ? isAdminItem 
                ? "bg-gray-900 text-white" 
                : "bg-orange-400 text-white"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          <item.icon
            className={`w-5 h-5 ${
              isActive ? "text-white" : "text-gray-400"
            }`}
          />
          <span className="flex-1">{item.name}</span>
          {isAdminItem && !isActive && (
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
          )}
        </Link>
      );
    });
  };

  return (
    <div className="flex h-screen bg-[#f8fafc] overflow-hidden font-sans">
      {/* Sidebar Desktop */}
      <aside className="w-64 bg-white border-r border-gray-200 flex-col hidden md:flex z-10">
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-orange-400 flex items-center justify-center text-white font-bold text-lg">
            F
          </div>
          <span className="font-bold text-xl text-gray-900">Frame Pro</span>
        </div>

        <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto custom-scrollbar">
          {renderNavItems()}
        </nav>
      </aside>

      {/* Sidebar Mobile Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm" 
            onClick={() => setIsMobileMenuOpen(false)} 
          />
          <aside className="relative w-64 max-w-[80vw] bg-white h-full flex flex-col shadow-2xl animate-in slide-in-from-left duration-300">
            <div className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-orange-400 flex items-center justify-center text-white font-bold text-lg">
                  F
                </div>
                <span className="font-bold text-xl text-gray-900">Frame Pro</span>
              </div>
              <button 
                onClick={() => setIsMobileMenuOpen(false)} 
                className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto custom-scrollbar">
              {renderNavItems(true)}
            </nav>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-8 z-10 shrink-0">
          <div className="flex items-center gap-3 md:hidden">
            <button 
              onClick={() => setIsMobileMenuOpen(true)} 
              className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="w-8 h-8 rounded-full bg-orange-400 flex items-center justify-center text-white font-bold">
              F
            </div>
            <span className="font-bold text-lg text-gray-900">Frame Pro</span>
          </div>
          <div className="hidden md:block"></div> {/* Spacer */}
          
          <div className="flex items-center gap-4">
            <button className="text-gray-500 hover:text-gray-700 transition-colors">
              <Bell className="w-5 h-5" />
            </button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-medium text-sm ml-2 outline-none ring-offset-2 focus:ring-2 focus:ring-orange-400 transition-shadow">
                  {getInitials()}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-gray-500 text-xs truncate">
                  {user?.email}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-red-600 cursor-pointer focus:bg-red-50 focus:text-red-600">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sair</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-[#f8fafc]">
          {children}
        </div>
      </main>

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #cbd5e1;
          border-radius: 20px;
        }
      `}} />
    </div>
  );
};