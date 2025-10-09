import React from "react";
import { Package, Tag, Folder, Settings, Users } from "lucide-react";
import type { UiProject } from "../../pages/ProjectDetailPage";

export const ProjectTabs: React.FC<{
  active: "assets" | "tags" | "resources" | "customers" | "settings";
  onChange: (t: "assets" | "tags" | "resources" | "customers" | "settings") => void;
  project: UiProject;
}> = ({ active, onChange }) => {
  const tabs = [
    { id: "assets", label: "Assets", icon: Package },
    { id: "tags", label: "Tags", icon: Tag },
    { id: "resources", label: "Resources", icon: Folder },
    { id: "customers", label: "Customers", icon: Users }, // ⬅️ nova aba
    { id: "settings", label: "Settings", icon: Settings },
  ] as const;

  return (
    <div className="border-b border-gray-200 dark:border-gray-800/50">
      <nav className="flex space-x-8 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-semibold text-sm transition-all duration-200 whitespace-nowrap
                ${
                  isActive
                    ? "border-gray-900 dark:border-white text-gray-900 dark:text-gray-100"
                    : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600"
                }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
