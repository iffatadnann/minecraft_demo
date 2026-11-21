// API error class for client-side and network errors
export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details; // [{ field, message }] for validation errors
  }
}

// Fallback http helper for any direct HTTP calls if needed
async function request(method, path, body, extra = {}) {
  const options = { method, headers: {}, ...extra };
  if (body !== undefined) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(path, options);
    if (!response.ok) {
      throw new ApiError(response.status, 'HTTP_ERROR', `Request failed with status ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(0, 'NETWORK', error.message || 'Network error');
  }
}

export const http = {
  get: (path) => request('GET', path),
  post: (path, body, extra) => request('POST', path, body, extra),
  patch: (path, body) => request('PATCH', path, body),
  delete: (path) => request('DELETE', path),
};
