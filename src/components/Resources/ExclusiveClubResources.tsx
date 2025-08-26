import React, { useState } from 'react';
import { Plus, Video, List, FileText, PenTool, Upload, Eye, Lock, Trash2, Edit3 } from 'lucide-react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Resource, Asset } from '../../types';

interface ExclusiveClubResourcesProps {
  projectId: string;
  assets: Asset[];
}

export const ExclusiveClubResources: React.FC<ExclusiveClubResourcesProps> = ({ projectId, assets }) => {
  const [activeResourceType, setActiveResourceType] = useState<'video' | 'playlist' | 'doc' | 'blog_post'>('video');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [resources, setResources] = useState<Resource[]>([]);
  const [newResource, setNewResource] = useState<Partial<Resource>>({
    name: '',
    description: '',
    content: '',
    url: '',
    image_url: '',
    category: '',
    author_name: '',
    author_description: '',
    author_profile_pic: '',
    access_type: 'public',
    required_assets: [],
  });

  const resourceTypes = [
    { id: 'video', label: 'Videos', icon: Video, color: 'text-red-500' },
    { id: 'playlist', label: 'Playlist Links', icon: List, color: 'text-blue-500' },
    { id: 'doc', label: 'Documents', icon: FileText, color: 'text-green-500' },
    { id: 'blog_post', label: 'Blog Posts', icon: PenTool, color: 'text-purple-500' },
  ];

  const handleCreateResource = (e: React.FormEvent) => {
    e.preventDefault();
    const resource: Resource = {
      id: `resource-${Date.now()}`,
      project_id: projectId,
      type: activeResourceType,
      name: newResource.name!,
      description: newResource.description,
      content: newResource.content,
      url: newResource.url,
      image_url: newResource.image_url,
      category: newResource.category,
      author_name: newResource.author_name,
      author_description: newResource.author_description,
      author_profile_pic: newResource.author_profile_pic,
      access_type: newResource.access_type!,
      required_assets: newResource.required_assets,
      created_at: new Date().toISOString(),
    };
    
    setResources(prev => [...prev, resource]);
    setNewResource({
      name: '',
      description: '',
      content: '',
      url: '',
      image_url: '',
      category: '',
      author_name: '',
      author_description: '',
      author_profile_pic: '',
      access_type: 'public',
      required_assets: [],
    });
    setIsModalOpen(false);
  };

  const filteredResources = resources.filter(r => r.type === activeResourceType);

  const renderResourceForm = () => {
    switch (activeResourceType) {
      case 'video':
      case 'playlist':
        return (
          <>
            <Input
              label="Name"
              value={newResource.name || ''}
              onChange={(e) => setNewResource({ ...newResource, name: e.target.value })}
              placeholder={`Enter ${activeResourceType} name`}
              required
            />
            <div className="space-y-1">
              <label className="block text-sm font-semibold text-gray-300 uppercase tracking-widest">
                Description
              </label>
              <textarea
                value={newResource.description || ''}
                onChange={(e) => setNewResource({ ...newResource, description: e.target.value })}
                placeholder="Enter description"
                rows={3}
                className="w-full px-4 py-3 bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-semibold text-gray-300 uppercase tracking-widest">
                Upload File
              </label>
              <div className="border-2 border-dashed border-gray-700/50 rounded-xl p-6 text-center hover:border-gray-600/50 transition-colors">
                <Upload className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">Click to upload or drag and drop</p>
                <input type="file" className="hidden" accept={activeResourceType === 'video' ? 'video/*' : '*'} />
              </div>
            </div>
          </>
        );
      
      case 'doc':
        return (
          <>
            <Input
              label="Document Name"
              value={newResource.name || ''}
              onChange={(e) => setNewResource({ ...newResource, name: e.target.value })}
              placeholder="Enter document name"
              required
            />
            <div className="space-y-1">
              <label className="block text-sm font-semibold text-gray-300 uppercase tracking-widest">
                Description
              </label>
              <textarea
                value={newResource.description || ''}
                onChange={(e) => setNewResource({ ...newResource, description: e.target.value })}
                placeholder="Enter description"
                rows={3}
                className="w-full px-4 py-3 bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-semibold text-gray-300 uppercase tracking-widest">
                Upload Document
              </label>
              <div className="border-2 border-dashed border-gray-700/50 rounded-xl p-6 text-center hover:border-gray-600/50 transition-colors">
                <Upload className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">Upload PDF, DOC, or DOCX files</p>
                <input type="file" className="hidden" accept=".pdf,.doc,.docx" />
              </div>
            </div>
          </>
        );
      
      case 'blog_post':
        return (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Title"
                value={newResource.name || ''}
                onChange={(e) => setNewResource({ ...newResource, name: e.target.value })}
                placeholder="Enter blog post title"
                required
              />
              <Input
                label="Category"
                value={newResource.category || ''}
                onChange={(e) => setNewResource({ ...newResource, category: e.target.value })}
                placeholder="Enter category"
              />
            </div>
            
            <div className="space-y-1">
              <label className="block text-sm font-semibold text-gray-300 uppercase tracking-widest">
                Featured Image URL
              </label>
              <input
                type="url"
                value={newResource.image_url || ''}
                onChange={(e) => setNewResource({ ...newResource, image_url: e.target.value })}
                placeholder="https://example.com/image.jpg"
                className="w-full px-4 py-3 bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-semibold text-gray-300 uppercase tracking-widest">
                Content
              </label>
              <textarea
                value={newResource.content || ''}
                onChange={(e) => setNewResource({ ...newResource, content: e.target.value })}
                placeholder="Write your blog post content..."
                rows={6}
                className="w-full px-4 py-3 bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Author Name"
                value={newResource.author_name || ''}
                onChange={(e) => setNewResource({ ...newResource, author_name: e.target.value })}
                placeholder="Enter author name"
              />
              <Input
                label="Author Profile Picture URL"
                value={newResource.author_profile_pic || ''}
                onChange={(e) => setNewResource({ ...newResource, author_profile_pic: e.target.value })}
                placeholder="https://example.com/avatar.jpg"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-semibold text-gray-300 uppercase tracking-widest">
                Author Description
              </label>
              <textarea
                value={newResource.author_description || ''}
                onChange={(e) => setNewResource({ ...newResource, author_description: e.target.value })}
                placeholder="Brief description about the author"
                rows={2}
                className="w-full px-4 py-3 bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>
          </>
        );
      
      default:
        return null;
    }
  };

  const renderAccessControl = () => (
    <div className="space-y-4 pt-4 border-t border-gray-700/50">
      <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-widest">Access Control</h4>
      
      <div className="space-y-1">
        <label className="block text-sm font-semibold text-gray-300 uppercase tracking-widest">
          Access Type
        </label>
        <select
          value={newResource.access_type}
          onChange={(e) => setNewResource({ ...newResource, access_type: e.target.value as 'public' | 'private' })}
          className="w-full px-4 py-3 bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        >
          <option value="public">Public</option>
          <option value="private">Private</option>
        </select>
      </div>

      {newResource.access_type === 'private' && (
        <div className="space-y-1">
          <label className="block text-sm font-semibold text-gray-300 uppercase tracking-widest">
            Required Assets
          </label>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {assets.map((asset) => (
              <label key={asset.id} className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={newResource.required_assets?.includes(asset.id) || false}
                  onChange={(e) => {
                    const currentAssets = newResource.required_assets || [];
                    if (e.target.checked) {
                      setNewResource({ ...newResource, required_assets: [...currentAssets, asset.id] });
                    } else {
                      setNewResource({ ...newResource, required_assets: currentAssets.filter(id => id !== asset.id) });
                    }
                  }}
                  className="w-4 h-4 text-blue-600 bg-gray-800/50 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                />
                <span className="text-sm text-gray-300">{asset.name}</span>
              </label>
            ))}
          </div>
          {assets.length === 0 && (
            <p className="text-sm text-gray-500">No assets available. Create assets first to set access requirements.</p>
          )}
        </div>
      )}
    </div>
  );

  const EmptyState: React.FC<{ type: typeof activeResourceType }> = ({ type }) => {
    const typeConfig = resourceTypes.find(t => t.id === type)!;
    const Icon = typeConfig.icon;
    
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800/50 rounded-2xl flex items-center justify-center mb-6 border border-gray-200 dark:border-gray-800/50">
          <Icon className={`w-8 h-8 ${typeConfig.color}`} />
        </div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2 tracking-tight">No {typeConfig.label.toLowerCase()} yet</h3>
        <p className="text-gray-600 dark:text-gray-400 text-center mb-8 max-w-md font-medium">
          Create your first {type.replace('_', ' ')} to get started with exclusive club resources.
        </p>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add {typeConfig.label.slice(0, -1)}
        </Button>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Resource Type Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-800/50">
        <nav className="flex space-x-8 overflow-x-auto">
          {resourceTypes.map((type) => {
            const Icon = type.icon;
            const isActive = activeResourceType === type.id;
            return (
              <button
                key={type.id}
                onClick={() => setActiveResourceType(type.id as any)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-semibold text-sm transition-all duration-200 whitespace-nowrap
                  ${isActive
                    ? 'border-gray-900 dark:border-white text-gray-900 dark:text-gray-100'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? type.color : ''}`} />
                <span>{type.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
          {resourceTypes.find(t => t.id === activeResourceType)?.label}
        </h3>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add {resourceTypes.find(t => t.id === activeResourceType)?.label.slice(0, -1)}
        </Button>
      </div>

      {filteredResources.length === 0 ? (
        <div className="bg-white dark:bg-gray-900/50 backdrop-blur-sm border border-gray-200 dark:border-gray-800/50 rounded-2xl">
          <EmptyState type={activeResourceType} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredResources.map((resource) => {
            const typeConfig = resourceTypes.find(t => t.id === resource.type)!;
            const Icon = typeConfig.icon;
            
            return (
              <div
                key={resource.id}
                className="bg-white dark:bg-gray-900/50 backdrop-blur-sm border border-gray-200 dark:border-gray-800/50 rounded-2xl p-6 hover:border-gray-300 dark:hover:border-gray-700/50 transition-all duration-200 group shadow-sm"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center">
                    <div className="p-2 bg-gray-100 dark:bg-gray-800/50 rounded-xl mr-3 border border-gray-200 dark:border-gray-800/50">
                      <Icon className={`w-5 h-5 ${typeConfig.color}`} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-gray-100">{resource.name}</h4>
                      <div className="flex items-center space-x-2 mt-1">
                        {resource.access_type === 'private' ? (
                          <Lock className="w-3 h-3 text-amber-500" />
                        ) : (
                          <Eye className="w-3 h-3 text-green-500" />
                        )}
                        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                          {resource.access_type}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800/50 rounded-lg transition-colors">
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                {resource.description && (
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">{resource.description}</p>
                )}
                
                {resource.category && (
                  <span className="inline-block px-2 py-1 text-xs font-medium text-purple-700 bg-purple-100 border border-purple-200 dark:text-purple-300 dark:bg-purple-900/30 dark:border-purple-800/50 rounded-full mb-4">
                    {resource.category}
                  </span>
                )}
                
                <div className="text-xs text-gray-500 dark:text-gray-500 font-medium">
                  Created {new Date(resource.created_at).toLocaleDateString()}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Resource Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={`Add ${resourceTypes.find(t => t.id === activeResourceType)?.label.slice(0, -1)}`}
        size="lg"
      >
        <form onSubmit={handleCreateResource} className="space-y-6">
          {renderResourceForm()}
          {renderAccessControl()}

          <div className="flex justify-end space-x-4 pt-4">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">
              Create {resourceTypes.find(t => t.id === activeResourceType)?.label.slice(0, -1)}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};