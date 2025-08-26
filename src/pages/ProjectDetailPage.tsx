import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Plus, Package, Tag, Settings, Trash2, Edit3, Copy, QrCode, Folder } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Asset, ProjectTag } from '../types';
import { ExclusiveClubResources } from '../components/Resources/ExclusiveClubResources';
import { ProfileCardResources } from '../components/Resources/ProfileCardResources';

export const ProjectDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<'assets' | 'tags' | 'resources' | 'settings'>('assets');
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [newAsset, setNewAsset] = useState({ name: '', description: '', type: 'unique' as 'unique' | 'generic' });
  const [newTag, setNewTag] = useState({ public_id: '', claim_mode: 'code' as 'code' | 'secure_tap' });

  // Mock project data
  const project = {
    id: id || '1',
    name: 'Company Profile',
    description: 'Main company profile with team information and project showcase',
    type: 'exclusive_club' as const,
    owners: ['user1', 'user2'],
    created_at: '2024-01-15T10:00:00Z',
  };

  const [assets, setAssets] = useState<Asset[]>([]);
  const [tags, setTags] = useState<ProjectTag[]>([]);

  const handleCreateAsset = (e: React.FormEvent) => {
    e.preventDefault();
    const asset: Asset = {
      id: `asset-${Date.now()}`,
      project_id: project.id,
      name: newAsset.name,
      description: newAsset.description,
      type: newAsset.type,
      created_at: new Date().toISOString(),
    };
    setAssets((prev) => [...prev, asset]);
    setNewAsset({ name: '', description: '', type: 'unique' });
    setIsAssetModalOpen(false);
  };

  const handleCreateTag = (e: React.FormEvent) => {
    e.preventDefault();
    const tag: ProjectTag = {
      id: `tag-${Date.now()}`,
      project_id: project.id,
      public_id: newTag.public_id,
      claim_mode: newTag.claim_mode,
      status: 'active',
      created_at: new Date().toISOString(),
    };
    setTags((prev) => [...prev, tag]);
    setNewTag({ public_id: '', claim_mode: 'code' });
    setIsTagModalOpen(false);
  };

  const EmptyState: React.FC<{ 
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    description: string;
    actionLabel: string;
    onAction: () => void;
  }> = ({ icon: Icon, title, description, actionLabel, onAction }) => (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800/50 rounded-2xl flex items-center justify-center mb-6 border border-gray-200 dark:border-gray-800/50">
        <Icon className="w-8 h-8 text-gray-400 dark:text-gray-500" />
      </div>
      <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2 tracking-tight">{title}</h3>
      <p className="text-gray-600 dark:text-gray-400 text-center mb-8 max-w-md font-medium">{description}</p>
      <Button onClick={onAction}>
        <Plus className="w-4 h-4 mr-2" />
        {actionLabel}
      </Button>
    </div>
  );

  const tabs = [
    { id: 'assets', label: 'Assets', icon: Package },
    { id: 'tags', label: 'Tags', icon: Tag },
    { id: 'resources', label: 'Resources', icon: Folder },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 bg-gray-50 dark:bg-gray-950 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-4">
          <Link
            to="/projects"
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800/50 rounded-xl transition-all duration-200"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">{project.name}</h1>
            <p className="text-gray-600 dark:text-gray-400 font-medium mt-1">{project.description}</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <span className="inline-flex px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800/50 rounded-full border border-gray-300 dark:border-gray-700/50">
            {project.type.replace('_', ' ')}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-800/50">
        <nav className="flex space-x-8 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === (tab.id as any);
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-semibold text-sm transition-all duration-200 whitespace-nowrap
                  ${isActive
                    ? 'border-gray-900 dark:border-white text-gray-900 dark:text-gray-100'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="animate-fade-in">
        {activeTab === 'assets' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">Project Assets</h2>
              <Button onClick={() => setIsAssetModalOpen(true)} className="whitespace-nowrap">
                <Plus className="w-4 h-4 mr-2" />
                Add Asset
              </Button>
            </div>

            {assets.length === 0 ? (
              <div className="bg-white dark:bg-gray-900/50 backdrop-blur-sm border border-gray-200 dark:border-gray-800/50 rounded-2xl">
                <EmptyState
                  icon={Package}
                  title="No assets yet"
                  description="Assets are digital resources that can be associated with your project tags. Create your first asset to get started."
                  actionLabel="Create Asset"
                  onAction={() => setIsAssetModalOpen(true)}
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {assets.map((asset) => (
                  <div
                    key={asset.id}
                    className="bg-white dark:bg-gray-900/50 backdrop-blur-sm border border-gray-200 dark:border-gray-800/50 rounded-2xl p-6 hover:border-gray-300 dark:hover:border-gray-700/50 transition-all duration-200 group shadow-sm"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center">
                        <div className="p-2 bg-gray-100 dark:bg-gray-800/50 rounded-xl mr-3 border border-gray-200 dark:border-gray-800/50">
                          <Package className="w-5 h-5 text-blue-500 dark:text-blue-400" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100">{asset.name}</h3>
                          <span
                            className={`inline-block px-2 py-1 text-xs font-medium rounded-full mt-1 border
                              ${asset.type === 'unique'
                                ? 'text-purple-700 bg-purple-100 border-purple-200 dark:text-purple-300 dark:bg-purple-900/30 dark:border-purple-800/50'
                                : 'text-blue-700 bg-blue-100 border-blue-200 dark:text-blue-300 dark:bg-blue-900/30 dark:border-blue-800/50'
                              }`}
                          >
                            {asset.type}
                          </span>
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
                    {asset.description && (
                      <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">{asset.description}</p>
                    )}
                    <div className="text-xs text-gray-500 dark:text-gray-500 font-medium">
                      Created {new Date(asset.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'tags' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">Project Tags</h2>
              <Button onClick={() => setIsTagModalOpen(true)} className="whitespace-nowrap">
                <Plus className="w-4 h-4 mr-2" />
                Create Tag
              </Button>
            </div>

            {tags.length === 0 ? (
              <div className="bg-white dark:bg-gray-900/50 backdrop-blur-sm border border-gray-200 dark:border-gray-800/50 rounded-2xl">
                <EmptyState
                  icon={Tag}
                  title="No tags created"
                  description="Tags are unique identifiers that can be claimed by users. Each tag can be associated with project assets and configured for different claim methods."
                  actionLabel="Create Tag"
                  onAction={() => setIsTagModalOpen(true)}
                />
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-900/50 backdrop-blur-sm border border-gray-200 dark:border-gray-800/50 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-800/50">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-widest">
                          Public ID
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-widest">
                          Status
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-widest">
                          Claim Mode
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-widest">
                          Created
                        </th>
                        <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-widest">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-800/50">
                      {tags.map((tag) => (
                        <tr key={tag.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <code className="text-sm font-mono text-gray-900 dark:text-gray-100 bg-gray-100 dark:bg-gray-800/50 px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-800/50">
                                {tag.public_id}
                              </code>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border
                                ${tag.status === 'active'
                                  ? 'text-green-700 bg-green-100 border-green-200 dark:text-green-300 dark:bg-green-900/30 dark:border-green-800/50'
                                  : tag.status === 'claimed'
                                  ? 'text-blue-700 bg-blue-100 border-blue-200 dark:text-blue-300 dark:bg-blue-900/30 dark:border-blue-800/50'
                                  : 'text-gray-700 bg-gray-100 border-gray-200 dark:text-gray-300 dark:bg-gray-800/30 dark:border-gray-700/50'
                                }`}
                            >
                              {tag.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300 font-medium">
                            {tag.claim_mode.replace('_', ' ')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400 font-medium">
                            {new Date(tag.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end space-x-2">
                              <button className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800/50 rounded-lg transition-colors">
                                <Copy className="w-4 h-4" />
                              </button>
                              <button className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800/50 rounded-lg transition-colors">
                                <QrCode className="w-4 h-4" />
                              </button>
                              <button className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'resources' && (
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 tracking-tight mb-2">Project Resources</h2>
              <p className="text-gray-600 dark:text-gray-400 font-medium">
                {project.type === 'exclusive_club' 
                  ? 'Manage content and access controls for your exclusive club members'
                  : 'Configure profile card settings and allowed social media connections'
                }
              </p>
            </div>

            {project.type === 'exclusive_club' ? (
              <ExclusiveClubResources projectId={project.id} assets={assets} />
            ) : (
              <ProfileCardResources projectId={project.id} />
            )}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-900/50 backdrop-blur-sm border border-gray-200 dark:border-gray-800/50 rounded-2xl p-6 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4 tracking-tight">Project Settings</h3>
              <div className="space-y-4">
                <Input label="Project Name" value={project.name} readOnly />
                
                <div className="space-y-1">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-widest">
                    Description
                  </label>
                  <textarea
                    value={project.description}
                    readOnly
                    rows={3}
                    className="w-full px-4 py-3 bg-white dark:bg-gray-800/50 backdrop-blur-sm border border-gray-300 dark:border-gray-700/50 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-widest">
                    Project Type
                  </label>
                  <select
                    value={project.type}
                    disabled
                    className="w-full px-4 py-3 bg-white dark:bg-gray-800/50 backdrop-blur-sm border border-gray-300 dark:border-gray-700/50 rounded-xl text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 opacity-80"
                  >
                    <option value="profile_card">Profile Card</option>
                    <option value="exclusive_club">Exclusive Club</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-red-50 dark:bg-red-900/20 backdrop-blur-sm border border-red-200 dark:border-red-800/50 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-red-700 dark:text-red-400 mb-2 tracking-tight">Danger Zone</h3>
              <p className="text-red-700/80 dark:text-gray-400 text-sm mb-4 font-medium">
                Once you delete a project, there is no going back. Please be certain.
              </p>
              <Button variant="secondary" className="text-red-700 dark:text-red-400 border-red-200 dark:border-red-800/50 hover:bg-red-100 dark:hover:bg-red-900/30">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Project
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Create Asset Modal */}
      <Modal isOpen={isAssetModalOpen} onClose={() => setIsAssetModalOpen(false)} title="Create New Asset">
        <form onSubmit={handleCreateAsset} className="space-y-6">
          <Input
            label="Asset Name"
            value={newAsset.name}
            onChange={(e) => setNewAsset({ ...newAsset, name: e.target.value })}
            placeholder="Enter asset name"
            required
          />
          
          <div className="space-y-1">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-widest">
              Description
            </label>
            <textarea
              value={newAsset.description}
              onChange={(e) => setNewAsset({ ...newAsset, description: e.target.value })}
              placeholder="Enter asset description"
              rows={3}
              className="w-full px-4 py-3 bg-white dark:bg-gray-800/50 backdrop-blur-sm border border-gray-300 dark:border-gray-700/50 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-widest">
              Asset Type
            </label>
            <select
              value={newAsset.type}
              onChange={(e) => setNewAsset({ ...newAsset, type: e.target.value as 'unique' | 'generic' })}
              className="w-full px-4 py-3 bg-white dark:bg-gray-800/50 backdrop-blur-sm border border-gray-300 dark:border-gray-700/50 rounded-xl text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              <option value="unique">Unique</option>
              <option value="generic">Generic</option>
            </select>
          </div>

          <div className="flex justify-end space-x-4 pt-4">
            <Button type="button" variant="secondary" onClick={() => setIsAssetModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">
              Create Asset
            </Button>
          </div>
        </form>
      </Modal>

      {/* Create Tag Modal */}
      <Modal isOpen={isTagModalOpen} onClose={() => setIsTagModalOpen(false)} title="Create New Tag">
        <form onSubmit={handleCreateTag} className="space-y-6">
          <Input
            label="Public ID"
            value={newTag.public_id}
            onChange={(e) => setNewTag({ ...newTag, public_id: e.target.value })}
            placeholder="Enter unique public ID"
            required
          />

          <div className="space-y-1">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-widest">
              Claim Mode
            </label>
            <select
              value={newTag.claim_mode}
              onChange={(e) => setNewTag({ ...newTag, claim_mode: e.target.value as 'code' | 'secure_tap' })}
              className="w-full px-4 py-3 bg-white dark:bg-gray-800/50 backdrop-blur-sm border border-gray-300 dark:border-gray-700/50 rounded-xl text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              <option value="code">Code</option>
              <option value="secure_tap">Secure Tap</option>
            </select>
          </div>

          <div className="flex justify-end space-x-4 pt-4">
            <Button type="button" variant="secondary" onClick={() => setIsTagModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">
              Create Tag
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
