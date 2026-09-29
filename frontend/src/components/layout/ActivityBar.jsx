/**
 * Activity Bar Component
 * 
 * Vertical icon bar for section navigation.
 * Features:
 * - Active state with left border indicator
 * - Tooltip on hover
 * - Badge support for notifications
 * - Smooth transitions
 */

import { motion } from 'framer-motion';

export default function ActivityBar({ 
  sections = [], 
  activeSection, 
  onSectionClick,
  collapsed = false 
}) {
  return (
    <div className="w-12 bg-slate-50 border-r border-gray-200 flex flex-col items-center py-2 gap-1 flex-shrink-0">
      {sections.map((section) => {
        const isActive = activeSection === section.id && !collapsed;
        
        return (
          <button
            key={section.id}
            onClick={() => onSectionClick(section.id)}
            className={`
              relative w-10 h-10 flex items-center justify-center rounded-lg
              transition-all duration-200
              ${isActive 
                ? 'bg-white shadow-sm border-l-2 border-l-blue-500 text-blue-600' 
                : 'text-gray-500 hover:bg-white hover:text-gray-700 hover:shadow-sm'
              }
            `}
            title={section.title}
          >
            {/* Icon */}
            <span className="text-lg">{section.icon}</span>
            
            {/* Badge */}
            {section.badge > 0 && (
              <span className={`
                absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] 
                flex items-center justify-center
                text-[10px] font-semibold rounded-full
                ${isActive 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-orange-500 text-white'
                }
              `}>
                {section.badge > 99 ? '99+' : section.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
