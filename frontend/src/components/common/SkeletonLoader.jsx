/**
 * Skeleton Loader Components
 * 
 * Animated placeholder components shown while data is loading.
 * Creates better perceived performance by showing content structure immediately.
 */

/**
 * Skeleton Equipment Card
 * Used in Equipment Browser while equipment data loads
 */
export function SkeletonEquipmentCard() {
  return (
    <div className="animate-pulse bg-surface border border-border rounded-lg p-3 mb-2">
      {/* Equipment name placeholder */}
      <div className="h-4 bg-surface-secondary rounded w-3/4 mb-2"></div>
      
      {/* Type badge placeholder */}
      <div className="h-3 bg-surface-secondary rounded w-1/3 mb-3"></div>
      
      {/* Stream info placeholders */}
      <div className="space-y-2">
        <div className="h-2 bg-surface-secondary rounded w-full"></div>
        <div className="h-2 bg-surface-secondary rounded w-5/6"></div>
      </div>
    </div>
  );
}

/**
 * Skeleton Warning Card
 * Used in Warnings Panel while data loads
 */
export function SkeletonWarningCard() {
  return (
    <div className="animate-pulse bg-surface border border-border rounded-lg p-3 mb-2">
      {/* Warning title */}
      <div className="h-4 bg-surface-secondary rounded w-2/3 mb-2"></div>
      
      {/* Warning message */}
      <div className="space-y-2">
        <div className="h-3 bg-surface-secondary rounded w-full"></div>
        <div className="h-3 bg-surface-secondary rounded w-4/5"></div>
      </div>
    </div>
  );
}

/**
 * Skeleton Stream Row
 * Used in Stream Table while data loads
 */
export function SkeletonStreamRow() {
  return (
    <div className="animate-pulse flex items-center gap-4 py-3 border-b border-border">
      <div className="h-3 bg-surface-secondary rounded w-16"></div>
      <div className="h-3 bg-surface-secondary rounded w-24"></div>
      <div className="h-3 bg-surface-secondary rounded w-20"></div>
      <div className="h-3 bg-surface-secondary rounded flex-1"></div>
    </div>
  );
}

/**
 * Generic Loading Spinner
 * Used anywhere we need a centered loading indicator
 */
export function LoadingSpinner({ size = 'md', text = '' }) {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-2',
    lg: 'w-12 h-12 border-3',
  };

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div
        className={`${sizeClasses[size]} border-primary border-t-transparent rounded-full animate-spin`}
      ></div>
      {text && <p className="text-sm text-content-secondary">{text}</p>}
    </div>
  );
}

/**
 * Canvas Loading Overlay
 * Full-screen loading indicator for Flow Canvas
 */
export function CanvasLoadingOverlay() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-surface/80 backdrop-blur-sm z-50">
      <div className="text-center">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-sm text-content-secondary font-medium">
          Loading flowsheet...
        </p>
      </div>
    </div>
  );
}
