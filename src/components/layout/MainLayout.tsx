import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { Outlet } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function MainLayout() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-12 sm:h-14 border-b border-border bg-card flex items-center justify-between px-3 sm:px-4 sticky top-0 z-10">
            <div className="flex items-center gap-2 sm:gap-4">
              <SidebarTrigger />
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="relative h-8 w-8 sm:h-9 sm:w-9">
                <Bell className="h-4 w-4" />
                <span className="absolute -top-0.5 -right-0.5 h-2 w-2 bg-destructive rounded-full" />
              </Button>
            </div>
          </header>
          <main className="flex-1 overflow-auto p-3 sm:p-4 md:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
