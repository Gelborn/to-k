import React from 'react';
import { FolderOpen, Users, Calendar, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Project } from '../../types';

interface ProjectCardProps {
  project: Project;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ project }) => {
  return (
    <Link 
      to={`/projects/${project.id}`}
      className="block bg-gray-900/50 backdrop-blur-sm border border-gray-800/50 rounded-2xl p-6 hover:border-gray-700/50 hover:bg-gray-900/70 transition-all duration-300 group animate-fade-in hover:shadow-xl"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center">
          <div className="p-3 bg-gray-800/50 rounded-xl mr-4 group-hover:bg-gray-800/70 transition-colors">
            <FolderOpen className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-100 group-hover:text-white transition-colors tracking-tight">{project.name}</h3>
            <span className="inline-block px-3 py-1 text-xs font-semibold text-gray-300 bg-gray-800/50 rounded-full mt-2 border border-gray-700/50">
              {project.type.replace('_', ' ')}
            </span>
          </div>
        </div>
        <ArrowRight className="w-5 h-5 text-gray-500 group-hover:text-gray-300 group-hover:translate-x-1 transition-all duration-200" />
      </div>
      
      <p className="text-gray-400 text-sm mb-6 line-clamp-2 font-medium leading-relaxed">
        {project.description}
      </p>
      
      <div className="flex items-center justify-between text-sm text-gray-500 font-medium">
        <div className="flex items-center">
          <Users className="w-4 h-4 mr-1" />
          <span>{project.owners.length} owners</span>
        </div>
        <div className="flex items-center">
          <Calendar className="w-4 h-4 mr-1" />
          <span>{new Date(project.created_at).toLocaleDateString()}</span>
        </div>
      </div>
    </Link>
  );
};