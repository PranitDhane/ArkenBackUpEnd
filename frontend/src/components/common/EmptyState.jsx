/**
 * Empty State Component
 * 
 * Friendly messages shown when there's no data to display.
 * Better UX than showing blank containers.
 */

export default function EmptyState({ 
  icon = '📭', 
  title = 'No data', 
  message = 'There is no data to display.',
  action = null 
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="text-6xl mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-content mb-2">{title}</h3>
      <p className="text-sm text-content-secondary mb-4 max-w-md">{message}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

/**
 * Pre-configured Empty States for common scenarios
 */

export function NoEquipmentFound({ onReset }) {
  return (
    <EmptyState
      icon="🔍"
      title="No equipment found"
      message="Try adjusting your filters or search terms to find equipment."
      action={
        onReset && (
          <button
            onClick={onReset}
            className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
          >
            Clear Filters
          </button>
        )
      }
    />
  );
}

export function NoWarnings() {
  return (
    <EmptyState
      icon="✅"
      title="No warnings"
      message="Your simulation completed successfully with no issues detected."
    />
  );
}

export function NoFlowsheet() {
  return (
    <EmptyState
      icon="📊"
      title="No flowsheet to display"
      message="Run a simulation to generate and view the process flowsheet."
    />
  );
}

export function NoStreams() {
  return (
    <EmptyState
      icon="💧"
      title="No streams"
      message="This simulation doesn't have any process streams defined."
    />
  );
}
