import React from "react";
import type { UiProject } from "../../../pages/ProjectDetailPage";
import { Input } from "../../ui/Input";

export const SettingsTab: React.FC<{
  project: UiProject;
  onUpdated?: () => void;
}> = ({ project }) => {
  // normalize type label
  const projectTypeLabel =
    project.type === "exclusive_club" ? "Content hub" : "Profile card";

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-900/50 backdrop-blur-sm border border-gray-200 dark:border-gray-800/50 rounded-2xl p-6 shadow-sm">
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4 tracking-tight">
          Project Settings
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input label="Project Name" value={project.name} readOnly />

          <div className="space-y-1 relative">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-widest">
              Project Type
            </label>
            <select
              value={projectTypeLabel}
              disabled
              className="w-full px-4 pr-10 py-3 bg-white dark:bg-gray-800/50 backdrop-blur-sm border border-gray-300 dark:border-gray-700/50 rounded-xl text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 opacity-80 appearance-none"
            >
              <option>Profile card</option>
              <option>Content hub</option>
            </select>
            {/* custom chevron */}
            <svg
              className="pointer-events-none absolute right-3 top-9 h-4 w-4 text-gray-400"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.25a.75.75 0 01-1.06 0L5.25 8.27a.75.75 0 01-.02-1.06z"
                clipRule="evenodd"
              />
            </svg>
          </div>

          <Input
            label="Destination URL"
            value={project.destination_url || ""}
            readOnly
          />

          {project.type === "exclusive_club" && (
            <Input
              label="Showroom Mode"
              value={project.showroom_mode ? "On" : "Off"}
              readOnly
            />
          )}
        </div>
      </div>

      <div className="bg-red-50 dark:bg-red-900/20 backdrop-blur-sm border border-red-200 dark:border-red-800/50 rounded-2xl p-6">
        <h3 className="text-lg font-bold text-red-700 dark:text-red-400 mb-2 tracking-tight">
          Danger Zone
        </h3>
        <p className="text-red-700/80 dark:text-gray-400 text-sm mb-4 font-medium">
          Once you delete a project, there is no going back. Please be certain.
        </p>
        <button
          className="px-4 py-2 rounded-xl border text-red-700 dark:text-red-400 border-red-200 dark:border-red-800/50 hover:bg-red-100 dark:hover:bg-red-900/30 text-sm font-semibold"
          // onClick={...}
        >
          Delete Project
        </button>
      </div>
    </div>
  );
};
