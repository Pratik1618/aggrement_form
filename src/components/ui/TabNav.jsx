import React, { useMemo, useCallback, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { LayoutDashboard, FilePlus2, FileText, History as HistoryIcon } from "lucide-react";
import { setActiveTab, closeAllModals, resetEditingState } from "../../slice/uiSlice";
import UnsavedChangesDialog from "../UnsavedChangesDialog";
import { Tabs, TabsList, TabsTrigger } from "./tabs";

const TAB_ICONS = {
  dashboard: LayoutDashboard,
  new: FilePlus2,
  agreements: FileText,
  history: HistoryIcon,
};

export default function TabNav() {
  const dispatch = useDispatch();
  const user = useSelector(state => state.user);
  const activeTab = useSelector(state => state.ui.activeTab);
  const editingAgreement = useSelector(state => state.ui.editingAgreement);
  const isFormDirty = useSelector(state => state.ui.isFormDirty);
  const [pendingTab, setPendingTab] = useState(null);

  const tabs = useMemo(() => {
    const hasEditingAgreement = !!editingAgreement;

    if (user.role === "Checker") {
      return [
        { id: "dashboard", label: "Dashboard" },
        { id: "new", label: "New Agreement" },
        { id: "agreements", label: "Agreements" },
      ];
    }

    const baseTabs = [
      { id: "dashboard", label: "Dashboard" },
      { id: "agreements", label: "Agreements" },
      { id: "history", label: "History" },
    ];

    if (hasEditingAgreement) {
      baseTabs.splice(1, 0, { id: "new", label: "New Agreement" });
    }

    return baseTabs;
  }, [user.role, editingAgreement]);

  const navigateTo = useCallback((tabId) => {
    dispatch(setActiveTab(tabId));
    dispatch(closeAllModals());
    if (tabId !== "new") {
      dispatch(resetEditingState());
    }
  }, [dispatch]);

  const handleTabChange = (tabId) => {
    if (isFormDirty && activeTab === "new" && tabId !== "new") {
      setPendingTab(tabId);
    } else {
      navigateTo(tabId);
    }
  };

  return (
    <nav className="border-b bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="py-2">
          <TabsList variant="line" className="h-auto bg-transparent p-0">
            {tabs.map((tab) => {
              const Icon = TAB_ICONS[tab.id];
              return (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="gap-2 px-3 py-2 text-sm"
                >
                  {Icon && <Icon className="size-4" />}
                  {tab.label}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>
      </div>
      <UnsavedChangesDialog
        open={!!pendingTab}
        onCancel={() => setPendingTab(null)}
        onDiscard={() => {
          navigateTo(pendingTab);
          setPendingTab(null);
        }}
      />
    </nav>
  );
}
