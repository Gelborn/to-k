import React, { useState } from 'react';
import { User, Check, X, Instagram, Twitter, Linkedin, Facebook, Youtube, Music, Github, Globe } from 'lucide-react';
import { Button } from '../ui/Button';
import { ProfileCardSettings, SOCIAL_MEDIA_OPTIONS } from '../../types';

interface ProfileCardResourcesProps {
  projectId: string;
}

const socialMediaIcons = {
  Instagram,
  Twitter,
  Linkedin,
  Facebook,
  Youtube,
  Music, // TikTok
  Github,
  Globe, // Website
};

export const ProfileCardResources: React.FC<ProfileCardResourcesProps> = ({ projectId }) => {
  const [settings, setSettings] = useState<ProfileCardSettings>({
    id: `settings-${projectId}`,
    project_id: projectId,
    allow_bio: true,
    allowed_social_media: ['instagram', 'twitter', 'linkedin'],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  const [hasChanges, setHasChanges] = useState(false);

  const handleBioToggle = () => {
    setSettings(prev => ({ ...prev, allow_bio: !prev.allow_bio }));
    setHasChanges(true);
  };

  const handleSocialMediaToggle = (socialId: string) => {
    setSettings(prev => {
      const isCurrentlyAllowed = prev.allowed_social_media.includes(socialId);
      const newAllowedSocialMedia = isCurrentlyAllowed
        ? prev.allowed_social_media.filter(id => id !== socialId)
        : [...prev.allowed_social_media, socialId];
      
      return {
        ...prev,
        allowed_social_media: newAllowedSocialMedia,
      };
    });
    setHasChanges(true);
  };

  const handleSave = () => {
    // Here you would save to your backend
    setSettings(prev => ({ ...prev, updated_at: new Date().toISOString() }));
    setHasChanges(false);
    // Show success message
  };

  const handleReset = () => {
    // Reset to last saved state or default
    setSettings({
      id: `settings-${projectId}`,
      project_id: projectId,
      allow_bio: true,
      allowed_social_media: ['instagram', 'twitter', 'linkedin'],
      created_at: settings.created_at,
      updated_at: settings.updated_at,
    });
    setHasChanges(false);
  };

  return (
    <div className="space-y-8">
      {/* Bio Settings */}
      <div className="bg-white dark:bg-gray-900/50 backdrop-blur-sm border border-gray-200 dark:border-gray-800/50 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-gray-100 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-800/50">
              <User className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 tracking-tight">Biography Section</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">
                Allow users to add a personal biography to their profile cards
              </p>
            </div>
          </div>
          <button
            onClick={handleBioToggle}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 ${
              settings.allow_bio ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.allow_bio ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
        
        {settings.allow_bio && (
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800/50">
            <div className="flex items-center space-x-2">
              <Check className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-blue-800 dark:text-blue-300">
                Users can add a biography section to their profile cards
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Social Media Settings */}
      <div className="bg-white dark:bg-gray-900/50 backdrop-blur-sm border border-gray-200 dark:border-gray-800/50 rounded-2xl p-6 shadow-sm">
        <div className="mb-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2 tracking-tight">Social Media Connections</h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">
            Select which social media platforms users can connect to their profile cards
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {SOCIAL_MEDIA_OPTIONS.map((social) => {
            const isAllowed = settings.allowed_social_media.includes(social.id);
            const IconComponent = socialMediaIcons[social.icon as keyof typeof socialMediaIcons];
            
            return (
              <div
                key={social.id}
                onClick={() => handleSocialMediaToggle(social.id)}
                className={`relative p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer hover:scale-105 ${
                  isAllowed
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-800/50 bg-gray-50 dark:bg-gray-800/30 hover:border-gray-300 dark:hover:border-gray-700/50'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${
                    isAllowed 
                      ? 'bg-blue-100 dark:bg-blue-800/50' 
                      : 'bg-gray-100 dark:bg-gray-700/50'
                  }`}>
                    <IconComponent className={`w-5 h-5 ${
                      isAllowed 
                        ? 'text-blue-600 dark:text-blue-400' 
                        : 'text-gray-500 dark:text-gray-400'
                    }`} />
                  </div>
                  <div className="flex-1">
                    <h4 className={`font-semibold text-sm ${
                      isAllowed 
                        ? 'text-blue-900 dark:text-blue-100' 
                        : 'text-gray-700 dark:text-gray-300'
                    }`}>
                      {social.name}
                    </h4>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    isAllowed
                      ? 'border-blue-500 bg-blue-500'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}>
                    {isAllowed && <Check className="w-3 h-3 text-white" />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800/30 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Selected: {settings.allowed_social_media.length} of {SOCIAL_MEDIA_OPTIONS.length} platforms
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Users will be able to connect these social media accounts to their profiles
              </p>
            </div>
            {settings.allowed_social_media.length === 0 && (
              <div className="flex items-center space-x-2 text-amber-600 dark:text-amber-400">
                <X className="w-4 h-4" />
                <span className="text-xs font-medium">No platforms selected</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Save Actions */}
      {hasChanges && (
        <div className="bg-white dark:bg-gray-900/50 backdrop-blur-sm border border-gray-200 dark:border-gray-800/50 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-gray-100">Unsaved Changes</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">You have unsaved changes to your profile card settings.</p>
            </div>
            <div className="flex items-center space-x-3">
              <Button variant="secondary" onClick={handleReset}>
                Reset
              </Button>
              <Button onClick={handleSave}>
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};