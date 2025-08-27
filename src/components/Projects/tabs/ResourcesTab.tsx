import React from "react";
import type { UiProject } from "../../../pages/ProjectDetailPage";
import { ExclusiveClubResources } from "../../Resources/ExclusiveClubResources";
import { ProfileCardResources } from "../../Resources/ProfileCardResources";

export const ResourcesTab: React.FC<{ project: UiProject }> = ({ project }) => {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 tracking-tight mb-2">
          Project Resources
        </h2>
        <p className="text-gray-600 dark:text-gray-400 font-medium">
          {project.type === "exclusive_club"
            ? "Manage content and access controls for your exclusive club members."
            : "Configure profile card options and allowed connections."}
        </p>
      </div>

      {project.type === "exclusive_club" ? (
        <ExclusiveClubResources projectId={project.id} assets={[]} />
      ) : (
        <ProfileCardResources projectId={project.id} />
      )}
    </div>
  );
};
