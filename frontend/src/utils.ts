
export const isOlderThan24h = (dateString: string | undefined | null) => {
  if (!dateString) return false;
  const regDate = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - regDate.getTime();
  const diffHrs = diffMs / (1000 * 60 * 60);
  return diffHrs > 24;
};
