import React, { useState } from 'react';
import { Plus, Calendar, Hash } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Tag } from '../types';

export const TagsPage: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTag, setNewTag] = useState({ tagId: '', project_id: '' });
  const [tags, setTags] = useState<Tag[]>([
    {
      id: '1',
      tagId: 'featured',
      project_id: '1',
      project: { id: '1', name: 'Company Profile', description: '', type: 'profile_card', owners: [], created_at: '' },
      created_at: '2024-01-15T10:00:00Z',
    },
    {
      id: '2',
      tagId: 'documentation',
      project_id: '2',
      project: { id: '2', name: 'Documentation Hub', description: '', type: 'doc_repo', owners: [], created_at: '' },
      created_at: '2024-01-14T15:30:00Z',
    },
  ]);

  const projects = [
    { id: '1', name: 'Company Profile' },
    { id: '2', name: 'Documentation Hub' },
    { id: '3', name: 'Product Catalog' },
  ];

  const handleCreateTag = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedProject = projects.find(p => p.id === newTag.project_id);
    
    const tag: Tag = {
      id: `tag-${Date.now()}`,
      tagId: newTag.tagId,
      project_id: newTag.project_id,
      project: selectedProject ? {
        id: selectedProject.id,
        name: selectedProject.name,
        description: '',
        type: 'profile_card',
        owners: [],
        created_at: '',
      } : undefined,
      created_at: new Date().toISOString(),
    };
    
    setTags([...tags, tag]);
    setNewTag({ tagId: '', project_id: '' });
    setIsModalOpen(false);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-100">Tags</h1>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Tag
        </Button>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Tag ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Project
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Created
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {tags.map((tag) => (
                <tr key={tag.id} className="hover:bg-gray-800/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {tag.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Hash className="w-4 h-4 text-gray-500 mr-2" />
                      <span className="text-sm text-gray-100">{tag.tagId}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-100">
                    {tag.project?.name || 'Unknown Project'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-400">
                      <Calendar className="w-4 h-4 mr-2" />
                      {new Date(tag.created_at).toLocaleDateString()}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {tags.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-400">No tags found. Create your first tag to get started.</p>
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add New Tag">
        <form onSubmit={handleCreateTag} className="space-y-6">
          <Input
            label="Tag ID"
            value={newTag.tagId}
            onChange={(e) => setNewTag({ ...newTag, tagId: e.target.value })}
            placeholder="Enter tag identifier"
            required
          />

          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-300 uppercase tracking-wider">
              Project
            </label>
            <select
              value={newTag.project_id}
              onChange={(e) => setNewTag({ ...newTag, project_id: e.target.value })}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select a project</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end space-x-4 pt-4">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">
              Add Tag
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};