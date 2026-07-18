export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {Icon && (
        <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full mb-4">
          <Icon className="h-8 w-8 text-gray-400 dark:text-gray-500" />
        </div>
      )}
      <h3 className="text-base font-semibold text-gray-700 dark:text-gray-200 mb-1">{title}</h3>
      {description && <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 max-w-sm">{description}</p>}
      {action}
    </div>
  );
}