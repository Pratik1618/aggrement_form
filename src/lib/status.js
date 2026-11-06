// Shared status/priority -> Badge className mapping so every screen
// (table, cards, dashboard, addendum views) renders the same colors
// for the same concept instead of each file inventing its own.

const STATUS_CLASSES = {
  "Execution Pending": "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/15 dark:text-yellow-400",
  "Executed": "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400",
  "Under Process with Client": "bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-400",
  "Approved": "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400",
  "Rejected": "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400",
  "Under Review": "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400",
  "Pending Review": "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/15 dark:text-yellow-400",
  "Pending": "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/15 dark:text-yellow-400",
  "Draft": "bg-gray-100 text-gray-700 dark:bg-gray-500/15 dark:text-gray-400",
};

const PRIORITY_CLASSES = {
  High: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400",
  Medium: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  Low: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400",
};

const FALLBACK_CLASSES = "bg-gray-100 text-gray-700 dark:bg-gray-500/15 dark:text-gray-400";

export function statusBadgeClass(status) {
  return STATUS_CLASSES[status] ?? FALLBACK_CLASSES;
}

export function priorityBadgeClass(priority) {
  return PRIORITY_CLASSES[priority] ?? FALLBACK_CLASSES;
}
