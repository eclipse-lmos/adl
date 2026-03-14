'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  Building2,
  Settings, 
  LogOut, 
  User as UserIcon, 
  BarChart3, 
  Bot, 
  ChevronsUpDown,
  FileJson, 
  LayoutTemplate, 
  Users, 
  MessageSquare 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUser, useAuth } from '@/firebase';
import { signOut } from 'firebase/auth';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  DEFAULT_ORGANIZATION_ID,
  getKnownOrganizations,
  readOrganizationAccess,
  subscribeToOrganizationAccess,
  writeOrganizationAccess,
} from "@/lib/organization-access";

export default function AppHeader() {
  const { user, loading } = useUser();
  const auth = useAuth();
  const [organizationAccess, setOrganizationAccess] = useState(() => readOrganizationAccess());

  useEffect(() => {
    setOrganizationAccess(readOrganizationAccess());
    return subscribeToOrganizationAccess((state) => {
      setOrganizationAccess(state);
    });
  }, []);

  const knownOrganizations = getKnownOrganizations(organizationAccess);
  const activeOrganization = knownOrganizations.find((organization) => organization.id === organizationAccess.activeOrganizationId)
    ?? knownOrganizations[0];

  const handleOrganizationSwitch = (organizationId: string) => {
    if (organizationId === DEFAULT_ORGANIZATION_ID || organizationId === organizationAccess.authorizedOrganizationId) {
      writeOrganizationAccess({
        activeOrganizationId: organizationId,
      });
    }
  };

  const handleLogout = async () => {
    if (!auth) return;
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <div className="top-4 left-0 right-0 z-50 px-4 md:px-6 pointer-events-none mt-4">
      <header className="mx-auto max-w-7xl h-16 w-full rounded-2xl border bg-background/80 backdrop-blur-md shadow-lg flex items-center justify-between px-4 md:px-6 pointer-events-auto transition-all">
        <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <h1 className="text-lg font-bold tracking-tight text-foreground">
            ADL Studio
          </h1>
        </Link>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          <Link href="/">
            <Button variant="ghost" size="sm" className="rounded-full border border-transparent hover:border-border px-4 transition-all">
              <Bot className="mr-2 h-4 w-4 text-primary" />
              <span className="hidden md:inline">Agents</span>
            </Button>
          </Link>
          <Link href="/analytics">
            <Button variant="ghost" size="sm" className="rounded-full border border-transparent hover:border-border px-4 transition-all">
              <BarChart3 className="mr-2 h-4 w-4 text-primary" />
              <span className="hidden md:inline">Analytics</span>
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="rounded-full border border-transparent hover:border-border px-4 transition-all">
              <FileJson className="mr-2 h-4 w-4 text-primary" />
              <span className="hidden md:inline">ADL</span>
            </Button>
          </Link>
          <Link href="/widgets">
            <Button variant="ghost" size="sm" className="rounded-full border border-transparent hover:border-border px-4 transition-all">
              <LayoutTemplate className="mr-2 h-4 w-4 text-primary" />
              <span className="hidden md:inline">Widgets</span>
            </Button>
          </Link>
          <Link href="/roles">
            <Button variant="ghost" size="sm" className="rounded-full border border-transparent hover:border-border px-4 transition-all">
              <Users className="mr-2 h-4 w-4 text-primary" />
              <span className="hidden md:inline">Roles</span>
            </Button>
          </Link>
          <Link href="/assistant">
            <Button variant="ghost" size="sm" className="rounded-full border border-transparent hover:border-border px-4 transition-all">
              <MessageSquare className="mr-2 h-4 w-4 text-primary" />
              <span className="hidden md:inline">Assistant</span>
            </Button>
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="hidden lg:flex items-center gap-2 rounded-full border bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground hover:border-border"
              >
                <Building2 className="h-4 w-4 text-primary" />
                <span className="uppercase tracking-wide">Org</span>
                <span className="max-w-[12rem] truncate text-foreground">{activeOrganization.name}</span>
                <span className="font-mono text-[11px] text-muted-foreground">{activeOrganization.id}</span>
                <ChevronsUpDown className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-72" align="end">
              <DropdownMenuLabel>Aktive Organisation</DropdownMenuLabel>
              <DropdownMenuLabel className="pt-0 font-normal text-xs text-muted-foreground">
                Wechsel zwischen `public` und der per API-Key autorisierten Organisation.
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup
                value={organizationAccess.activeOrganizationId}
                onValueChange={handleOrganizationSwitch}
              >
                {knownOrganizations.map((organization) => (
                  <DropdownMenuRadioItem key={organization.id} value={organization.id}>
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate">{organization.name}</span>
                      <span className="font-mono text-[11px] text-muted-foreground">{organization.id}</span>
                    </div>
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/organizations">Organisationen verwalten</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Separator orientation="vertical" className="h-6 mx-1 hidden md:block" />
          
          <Link href="/settings">
            <Button variant="ghost" size="icon" className="rounded-full border border-transparent hover:border-border transition-all">
              <Settings className="h-5 w-5" />
              <span className="sr-only">Settings</span>
            </Button>
          </Link>

          {!loading && user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full ml-1 border hover:border-primary/50 transition-colors p-0 overflow-hidden">
                  <Avatar className="h-full w-full">
                    <AvatarImage src={user.photoURL || ''} alt={user.displayName || ''} />
                    <AvatarFallback className="bg-primary/5">{user.displayName?.[0] || <UserIcon className="h-4 w-4" />}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 mt-2" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.displayName}</p>
                    <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:bg-destructive focus:text-destructive-foreground cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </header>
    </div>
  );
}
