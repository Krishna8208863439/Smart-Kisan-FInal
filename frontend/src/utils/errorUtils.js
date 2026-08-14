/**
 * Safely extracts a human-readable error message string from any error input
 * (String, Error object, API JSON response object, or Axios/Fetch error).
 * Prevents raw string interpolation of objects resulting in '[object Object]'.
 */
export const extractErrorMessage = (err, fallback = "Unknown error") => {
  if (!err) return fallback;
  
  if (typeof err === "string") {
    return err.trim() || fallback;
  }
  
  if (err instanceof Error && err.message) {
    return err.message;
  }
  
  if (typeof err === "object") {
    if (err.error) {
      if (typeof err.error === "string") return err.error;
      if (typeof err.error === "object") {
        return err.error.message || err.error.error || err.error.detail || JSON.stringify(err.error);
      }
    }
    
    if (err.message) {
      if (typeof err.message === "string") return err.message;
      if (typeof err.message === "object") {
        return err.message.message || JSON.stringify(err.message);
      }
    }

    if (err.detail) {
      if (typeof err.detail === "string") return err.detail;
    }

    if (err.response?.data) {
      const d = err.response.data;
      if (typeof d === "string") return d;
      if (d.error) return typeof d.error === "string" ? d.error : (d.error.message || JSON.stringify(d.error));
      if (d.message) return typeof d.message === "string" ? d.message : JSON.stringify(d.message);
    }

    try {
      const jsonStr = JSON.stringify(err);
      return jsonStr !== "{}" ? jsonStr : fallback;
    } catch (e) {
      return fallback;
    }
  }

  return String(err) || fallback;
};
