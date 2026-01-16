import React from 'react';
import { GraduationCap, Shield, Briefcase } from 'lucide-react';

const BADGE_CONFIG = {
  educator: {
    icon: GraduationCap,
    label: 'Educator',
    color: '#6366F1',
    bgColor: '#6366F1/20'
  },
  validator: {
    icon: Shield,
    label: 'Validator',
    color: '#10B981',
    bgColor: '#10B981/20'
  },
  brand_partner: {
    icon: Briefcase,
    label: 'Brand Partner',
    color: '#F59E0B',
    bgColor: '#F59E0B/20'
  }
};

export default function EducatorBadge({ type = 'educator', size = 'sm', showLabel = false }) {
  const config = BADGE_CONFIG[type] || BADGE_CONFIG.educator;
  const Icon = config.icon;

  const sizeClasses = {
    xs: 'w-4 h-4',
    sm: 'w-5 h-5',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  const iconSizes = {
    xs: 'w-2.5 h-2.5',
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  if (showLabel) {
    return (
      <div
        className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full"
        style={{ backgroundColor: `${config.color}20` }}
      >
        <Icon className={iconSizes[size]} style={{ color: config.color }} />
        <span
          className="text-xs font-semibold"
          style={{ color: config.color }}
        >
          {config.label}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`${sizeClasses[size]} rounded-full flex items-center justify-center`}
      style={{ backgroundColor: `${config.color}20` }}
      title={config.label}
    >
      <Icon className={iconSizes[size]} style={{ color: config.color }} />
    </div>
  );
}