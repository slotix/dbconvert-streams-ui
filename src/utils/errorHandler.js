export function handleApiError(error) {
  const message = error.response?.data.error || error.message;
  return new Error(message);
}