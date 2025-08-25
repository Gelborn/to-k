import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { CreateProjectModal } from '../components/Projects/CreateProjectModal';
import { ProjectCard } from '../components/Projects/ProjectCard';
import { Project } from '../types';

export const ProjectsPage: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([
    {
      id: '1',
      name: 'Company Profile',
      description: 'Main company profile with team information and project showcase',
      type: 'profile_card',
      owners: ['user1', 'user2'],
      created_at: '2024-01-15T10:00:00Z',
    },
    {
      id: '2',
      name: 'Documentation Hub',
      description: 'Central repository for all technical documentation and guides',
      type: 'exclusive_club',
      owners: ['user3'],
      created_at: '2024-01-10T14:30:00Z',
    },
    {
      id: '3',
      name: 'Product Catalog',
      description: 'Interactive catalog showcasing all our products and services',
      type: 'profile_card',
      owners: ['user1', 'user4'],
      created_at: '2024-01-05T09:15:00Z',
    },
  ]);

  const handleCreateProject = (projectData: Omit<Project, 'id' | 'created_at'>) => {
    const newProject: Project = {
      ...projectData,
      id: `project-${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    setProjects([...projects, newProject]);
  };

  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-950 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Projects</h1>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Project
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>

      {projects.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-600 dark:text-gray-400">No projects found. Create your first project to get started.</p>
        </div>
      )}

      <CreateProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateProject}
      />
    </div>
  );
};