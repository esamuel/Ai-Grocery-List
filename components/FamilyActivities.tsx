import React, { useEffect, useState } from 'react';
import { getFamilyMembers, getFamilyActivities, type FamilyMember, type FamilyActivity } from '../services/familyActivityService';

interface FamilyActivitiesProps {
  userId: string;
  listId: string;
  translations: {
    title: string;
    subtitle: string;
    membersTitle: string;
    owner: string;
    member: string;
    activeNow: string;
    recentActivityTitle: string;
    noActivity: string;
    checkedOff: string;
    added: string;
    removed: string;
    you: string;
    minutesAgo: string;
    hoursAgo: string;
    daysAgo: string;
    justNow: string;
  };
  rtl?: boolean;
}

export const FamilyActivities: React.FC<FamilyActivitiesProps> = ({
  userId,
  listId,
  translations,
  rtl = false
}) => {
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [activities, setActivities] = useState<FamilyActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        console.log('FamilyActivities: Loading data for listId:', listId, 'userId:', userId);
        const [membersData, activitiesData] = await Promise.all([
          getFamilyMembers(listId),
          getFamilyActivities(listId) // Get last 3 activities per member
        ]);
        console.log('FamilyActivities: Loaded members:', membersData);
        console.log('FamilyActivities: Loaded activities:', activitiesData);
        setMembers(membersData);
        setActivities(activitiesData);
      } catch (error) {
        console.error('Error loading family data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (listId && userId) {
      loadData();
      // Refresh data every 30 seconds for real-time updates
      const interval = setInterval(loadData, 30000);
      return () => clearInterval(interval);
    } else {
      console.warn('FamilyActivities: Missing listId or userId', { listId, userId });
      setLoading(false);
    }
  }, [listId, userId]);

  const formatTimeAgo = (timestamp: string): string => {
    const now = new Date();
    const activityTime = new Date(timestamp);
    const diffMs = now.getTime() - activityTime.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return translations.justNow;
    if (diffMins < 60) return `${diffMins}${translations.minutesAgo}`;
    if (diffHours < 24) return `${diffHours}${translations.hoursAgo}`;
    return `${diffDays}${translations.daysAgo}`;
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'checked':
        return '✅';
      case 'added':
        return '➕';
      case 'removed':
        return '🗑️';
      default:
        return '📝';
    }
  };

  const getActivityText = (activity: FamilyActivity) => {
    const displayName = activity.userId === userId ? translations.you : activity.userName;

    switch (activity.type) {
      case 'checked':
        return `${displayName} ${translations.checkedOff} ${activity.itemName}`;
      case 'added':
        return `${displayName} ${translations.added} ${activity.itemName}`;
      case 'removed':
        return `${displayName} ${translations.removed} ${activity.itemName}`;
      default:
        return `${displayName} updated ${activity.itemName}`;
    }
  };

  const getMemberStatusColor = (lastActive: string): string => {
    const now = new Date();
    const lastActiveTime = new Date(lastActive);
    const diffMins = Math.floor((now.getTime() - lastActiveTime.getTime()) / 60000);

    if (diffMins < 5) return 'text-green-500';
    return 'text-gray-400';
  };

  const getMemberStatusText = (lastActive: string, isCurrentUser: boolean): string => {
    if (isCurrentUser) return translations.activeNow;

    const now = new Date();
    const lastActiveTime = new Date(lastActive);
    const diffMins = Math.floor((now.getTime() - lastActiveTime.getTime()) / 60000);

    if (diffMins < 5) return translations.activeNow;
    return formatTimeAgo(lastActive);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 pb-24 ${rtl ? 'rtl' : ''}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-pink-600 px-6 py-8 text-white">
        <h1 className="text-3xl font-bold">{translations.title}</h1>
        <p className="text-sm opacity-90 mt-1">{translations.subtitle}</p>
      </div>

      {/* Content */}
      <div className="px-4 py-4 space-y-4">
        {/* Family Members Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
          <h3 className="font-bold text-gray-800 dark:text-white mb-3 text-lg">
            {translations.membersTitle}
          </h3>
          <div className="space-y-3">
            {members.map((member) => {
              const isCurrentUser = member.id === userId;
              const avatarColors = [
                'bg-blue-500',
                'bg-purple-500',
                'bg-pink-500',
                'bg-green-500',
                'bg-yellow-500',
                'bg-red-500',
                'bg-indigo-500',
                'bg-teal-500'
              ];
              const colorIndex = member.id.charCodeAt(0) % avatarColors.length;
              const avatarColor = avatarColors[colorIndex];

              return (
                <div key={member.id} className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-full ${avatarColor} flex items-center justify-center text-white font-bold text-lg`}
                  >
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800 dark:text-white">
                      {member.name}
                      {isCurrentUser && ` (${translations.you})`}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {member.isOwner ? translations.owner : translations.member}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-medium ${getMemberStatusColor(
                      member.lastActive
                    )}`}
                  >
                    ● {getMemberStatusText(member.lastActive, isCurrentUser)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Activity Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
          <h3 className="font-bold text-gray-800 dark:text-white mb-3 text-lg">
            {translations.recentActivityTitle}
          </h3>
          {activities.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">
              {translations.noActivity}
            </p>
          ) : (
            <div className="space-y-3">
              {activities.map((activity, index) => (
                <div
                  key={`${activity.timestamp}-${index}`}
                  className="flex gap-3 items-start p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <div className="text-2xl flex-shrink-0">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 dark:text-white break-words">
                      {getActivityText(activity)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {formatTimeAgo(activity.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
