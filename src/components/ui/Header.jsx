import React, { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { ChevronDown, FileSignature, LogOut } from "lucide-react";
import { clearSession } from "../../lib/auth";
import { logout } from "../../slice/userSlice";
import { closeAllModals, resetEditingState, setActiveTab } from "../../slice/uiSlice";
import UnsavedChangesDialog from "../UnsavedChangesDialog";
import { Avatar, AvatarFallback } from "./avatar";
import { Badge } from "./badge";
import { Button } from "./button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./dropdown-menu";

const getInitials = (name) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");

export default function Header() {
  const dispatch = useDispatch();
  const user = useSelector(state => state.user);
  const isFormDirty = useSelector(state => state.ui.isFormDirty);
  const [confirmingSignOut, setConfirmingSignOut] = useState(false);

  const signOut = () => {
    clearSession();
    dispatch(closeAllModals());
    dispatch(resetEditingState());
    dispatch(setActiveTab("dashboard"));
    dispatch(logout());
  };

  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <FileSignature className="size-5" />
          </span>
          <span className="text-lg font-semibold text-foreground">Legal Agreement ERP</span>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-10 gap-2 px-2">
              <Avatar className="size-8">
                <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
              </Avatar>
              <span className="hidden text-left sm:block">
                <span className="block text-sm leading-tight font-medium">{user.name}</span>
                <span className="block text-xs leading-tight font-normal text-muted-foreground">{user.role}</span>
              </span>
              <ChevronDown className="size-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel className="font-normal">
              <p className="text-sm font-medium text-foreground">{user.name}</p>
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
              <Badge variant="secondary" className="mt-2">{user.role}</Badge>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => (isFormDirty ? setConfirmingSignOut(true) : signOut())}>
              <LogOut className="size-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <UnsavedChangesDialog
        open={confirmingSignOut}
        onCancel={() => setConfirmingSignOut(false)}
        onDiscard={signOut}
      />
    </header>
  );
}
