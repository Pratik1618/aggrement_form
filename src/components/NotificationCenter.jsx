import React, { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { BellOff, X } from "lucide-react";
import { markAsRead, markAllAsRead, removeNotification, clearAllNotifications } from "../slice/notificationsSlice";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const PRIORITY_CLASSES = {
  high: "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-400",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-500/15 dark:text-yellow-400",
  low: "bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-400",
};

const NotificationCenter = ({ isOpen, onClose }) => {
  const dispatch = useDispatch();
  const { notifications, unreadCount } = useSelector(state => state.notifications);
  const [filter, setFilter] = useState("all");

  const filteredNotifications = notifications.filter(notification => {
    switch (filter) {
      case "unread": return !notification.read;
      case "high": return notification.priority === "high";
      case "medium": return notification.priority === "medium";
      case "low": return notification.priority === "low";
      default: return true;
    }
  });

  const sortedNotifications = [...filteredNotifications].sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    }
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  const handleMarkAsRead = (notificationId) => dispatch(markAsRead(notificationId));
  const handleRemoveNotification = (notificationId) => dispatch(removeNotification(notificationId));
  const handleMarkAllAsRead = () => dispatch(markAllAsRead());
  const handleClearAll = () => dispatch(clearAllNotifications());

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="absolute right-0 top-0 h-full w-96 bg-card shadow-xl">
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b px-6 py-4">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-foreground">Notifications</h2>
              {unreadCount > 0 && (
                <Badge className="bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-400">
                  {unreadCount}
                </Badge>
              )}
            </div>
            <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close notifications">
              <X className="size-4" />
            </Button>
          </div>

          <div className="border-b px-6 py-3">
            <Tabs value={filter} onValueChange={setFilter}>
              <TabsList className="w-full">
                {[
                  { key: "all", label: "All" },
                  { key: "unread", label: "Unread" },
                  { key: "high", label: "High" },
                  { key: "medium", label: "Medium" },
                  { key: "low", label: "Low" },
                ].map(tab => (
                  <TabsTrigger key={tab.key} value={tab.key} className="text-xs">
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          <div className="flex items-center gap-4 border-b px-6 py-3">
            <Button
              variant="link"
              className="h-auto p-0 text-sm"
              onClick={handleMarkAllAsRead}
              disabled={unreadCount === 0}
            >
              Mark All Read
            </Button>
            <Button
              variant="link"
              className="h-auto p-0 text-sm text-destructive"
              onClick={handleClearAll}
            >
              Clear All
            </Button>
          </div>

          <ScrollArea className="flex-1">
            {sortedNotifications.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center py-16 text-muted-foreground">
                <BellOff className="mb-4 size-10" />
                <p className="text-sm">No notifications</p>
                <p className="text-xs text-muted-foreground/70">You&apos;re all caught up!</p>
              </div>
            ) : (
              <div className="divide-y">
                {sortedNotifications.map(notification => (
                  <div
                    key={notification.id}
                    className={`p-4 ${!notification.read ? "bg-primary/5" : ""}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="mb-1 flex items-center gap-2">
                          <Badge className={PRIORITY_CLASSES[notification.priority] || "bg-muted text-muted-foreground"}>
                            {notification.priority}
                          </Badge>
                          {!notification.read && (
                            <span className="size-2 rounded-full bg-primary" />
                          )}
                        </div>
                        <h3 className="mb-1 text-sm font-medium text-foreground">
                          {notification.title}
                        </h3>
                        <p className="mb-2 text-sm text-muted-foreground">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground/70">
                          {new Date(notification.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="ml-2 flex flex-col items-end gap-1">
                        {!notification.read && (
                          <Button
                            variant="link"
                            className="h-auto p-0 text-xs"
                            onClick={() => handleMarkAsRead(notification.id)}
                          >
                            Mark Read
                          </Button>
                        )}
                        <Button
                          variant="link"
                          className="h-auto p-0 text-xs text-destructive"
                          onClick={() => handleRemoveNotification(notification.id)}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </div>
    </div>
  );
};

export default NotificationCenter;
