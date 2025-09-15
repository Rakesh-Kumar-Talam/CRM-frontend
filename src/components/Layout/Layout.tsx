import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Home,
  Users,
  ShoppingCart,
  Target,
  Megaphone,
  MessageSquare,
  Menu,
  X,
  LogOut,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { logout } = useAuth();
  const location = useLocation();

  const navigation = [
    { name: "Dashboard", href: "/", icon: Home, color: "from-blue-500 to-cyan-500" },
    { name: "Customers", href: "/customers", icon: Users, color: "from-emerald-500 to-teal-500" },
    { name: "Orders", href: "/orders", icon: ShoppingCart, color: "from-orange-500 to-red-500" },
    { name: "Segments", href: "/segments", icon: Target, color: "from-purple-500 to-pink-500" },
    { name: "Campaigns", href: "/campaigns", icon: Megaphone, color: "from-indigo-500 to-purple-500" },
    { name: "Messaging", href: "/messaging", icon: MessageSquare, color: "from-green-500 to-emerald-500" },
  ];

  const isCurrentPath = (path: string) => {
    if (path === "/") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex">
      {/* Mobile sidebar */}
      <div
        className={`fixed inset-0 z-50 lg:hidden transition-opacity duration-300 ${
          sidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
        <div className="relative flex flex-col max-w-xs w-full bg-white/95 backdrop-blur-xl shadow-2xl">
          <div className="absolute top-0 right-0 -mr-12 pt-2">
            <button
              type="button"
              className="ml-1 flex items-center justify-center h-10 w-10 rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white/50"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          <div className="flex-1 h-0 pt-8 pb-4 overflow-y-auto flex flex-col">
            <div className="flex-shrink-0 flex items-center px-6 mb-8">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center shadow-lg">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                    CRM Pro
                  </h1>
                  <p className="text-xs text-gray-500">Business Suite</p>
                </div>
              </div>
            </div>
            <nav className="px-4 space-y-2 flex-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = isCurrentPath(item.href);
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`group relative flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                      isActive
                        ? "bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg shadow-purple-500/25"
                        : "text-gray-600 hover:bg-white/60 hover:text-gray-900 hover:shadow-md"
                    }`}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <div className={`p-2 rounded-lg mr-3 transition-all duration-200 ${
                      isActive 
                        ? "bg-white/20" 
                        : `bg-gradient-to-r ${item.color} group-hover:scale-110`
                    }`}>
                      <Icon className={`h-5 w-5 ${isActive ? "text-white" : "text-white"}`} />
                    </div>
                    <span className="flex-1">{item.name}</span>
                    {isActive && (
                      <ChevronRight className="h-4 w-4 text-white/80" />
                    )}
                  </Link>
                );
              })}
            </nav>
            {/* Sign out at bottom */}
            <div className="border-t border-gray-200/50 p-4 mt-4">
              <button
                onClick={logout}
                className="w-full group flex items-center px-4 py-3 text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all duration-200"
              >
                <div className="p-2 rounded-lg mr-3 bg-red-100 group-hover:bg-red-200 transition-colors duration-200">
                  <LogOut className="h-5 w-5 text-red-500" />
                </div>
                <span>Sign out</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop sidebar (fixed) */}
      <div className="hidden lg:flex lg:flex-col lg:w-72 lg:flex-shrink-0 bg-white/80 backdrop-blur-xl shadow-xl border-r border-white/20 fixed inset-y-0 left-0">
        <div className="flex flex-col flex-1 pt-8 pb-4 overflow-y-auto">
          <div className="flex items-center flex-shrink-0 px-6 mb-8">
            <div className="flex items-center space-x-3">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center shadow-lg">
                <Sparkles className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  CRM Pro
                </h1>
                <p className="text-sm text-gray-500">Business Suite</p>
              </div>
            </div>
          </div>
          <nav className="px-4 space-y-2 flex-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = isCurrentPath(item.href);
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`group relative flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                    isActive
                      ? "bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg shadow-purple-500/25"
                      : "text-gray-600 hover:bg-white/60 hover:text-gray-900 hover:shadow-md"
                  }`}
                >
                  <div className={`p-2 rounded-lg mr-3 transition-all duration-200 ${
                    isActive 
                      ? "bg-white/20" 
                      : `bg-gradient-to-r ${item.color} group-hover:scale-110`
                  }`}>
                    <Icon className={`h-5 w-5 ${isActive ? "text-white" : "text-white"}`} />
                  </div>
                  <span className="flex-1">{item.name}</span>
                  {isActive && (
                    <ChevronRight className="h-4 w-4 text-white/80" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
        {/* Sign out at bottom */}
        <div className="border-t border-gray-200/50 p-4">
          <button 
            onClick={logout} 
            className="w-full group flex items-center px-4 py-3 text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all duration-200"
          >
            <div className="p-2 rounded-lg mr-3 bg-red-100 group-hover:bg-red-200 transition-colors duration-200">
              <LogOut className="h-5 w-5 text-red-500" />
            </div>
            <span>Sign out</span>
          </button>
        </div>
      </div>

      {/* Main content (shifted for sidebar) */}
      <div className="flex-1 flex flex-col lg:pl-72">
        {/* Mobile menu button */}
        <div className="sticky top-0 z-10 lg:hidden pl-1 pt-1 sm:pl-3 sm:pt-3 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
          <button
            type="button"
            className="-ml-0.5 -mt-0.5 h-12 w-12 inline-flex items-center justify-center rounded-xl text-gray-500 hover:text-gray-900 hover:bg-white/60 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-purple-500 transition-all duration-200"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>

        <main className="flex-1">
          <div className="py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
