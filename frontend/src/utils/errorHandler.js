/**
 * Extract realistic, human-readable error messages from API response objects or network errors.
 * E.g., returns "name: A team with this name already exists." instead of generic "Failed to save team."
 */
export const getErrorMessage = (err, defaultMsg = 'An unexpected error occurred. Please try again.') => {
  if (!err) return defaultMsg;
  if (typeof err === 'string') return err;

  const responseData = err.response?.data;

  if (responseData) {
    // 1. Direct string error/detail message
    if (typeof responseData.detail === 'string' && responseData.detail.trim()) {
      return responseData.detail;
    }
    if (typeof responseData.error === 'string' && responseData.error.trim()) {
      return responseData.error;
    }
    if (typeof responseData.message === 'string' && responseData.message.trim()) {
      return responseData.message;
    }

    // 2. DRF Field level errors: e.g. { name: ["A team with this name already exists."], email: ["Enter a valid email."] }
    if (typeof responseData === 'object' && !Array.isArray(responseData)) {
      const messages = [];

      Object.entries(responseData).forEach(([key, value]) => {
        if (key === 'detail' || key === 'error' || key === 'message') {
          if (typeof value === 'string') messages.push(value);
        } else {
          const formattedKey = key === 'non_field_errors' ? '' : `${key.replace(/_/g, ' ')}: `;
          if (Array.isArray(value)) {
            const joined = value.map(v => (typeof v === 'string' ? v : JSON.stringify(v))).join(', ');
            messages.push(`${formattedKey}${joined}`);
          } else if (typeof value === 'string') {
            messages.push(`${formattedKey}${value}`);
          } else if (typeof value === 'object' && value !== null) {
            messages.push(`${formattedKey}${JSON.stringify(value)}`);
          }
        }
      });

      if (messages.length > 0) {
        return messages.join(' | ');
      }
    }

    // 3. Array of error messages
    if (Array.isArray(responseData)) {
      const stringErrors = responseData.filter(item => typeof item === 'string');
      if (stringErrors.length > 0) return stringErrors.join(' | ');
    }
  }

  // 4. Axios Status Codes & Network Errors
  if (err.response?.status === 400) {
    return defaultMsg || 'Invalid data submitted. Please verify input fields.';
  }
  if (err.response?.status === 401) {
    return 'Your session has expired. Please log in again.';
  }
  if (err.response?.status === 403) {
    return 'Access restricted: You do not have permission to perform this action.';
  }
  if (err.response?.status === 404) {
    return 'The requested resource was not found.';
  }
  if (err.response?.status === 409) {
    return 'Conflict detected: An item with these details already exists.';
  }
  if (err.response?.status >= 500) {
    return 'Internal server error. Please contact system administrator.';
  }

  if (err.message && err.message !== 'Network Error') {
    return err.message;
  }
  if (!err.response) {
    return 'Unable to connect to server. Please check your network connection or verify backend server is running.';
  }

  return defaultMsg;
};
