import { format, isValid, parseISO } from "date-fns";

// parseISO keeps date-only strings in local time; new Date() would shift them a day west of UTC.
export const toDate = (value) => {
  if (!value) return null;
  const date = typeof value === "string" ? parseISO(value) : new Date(value);
  return isValid(date) ? date : null;
};

export const formatDate = (value, fallback = "N/A") => {
  const date = toDate(value);
  return date ? format(date, "dd MMM yyyy") : fallback;
};
