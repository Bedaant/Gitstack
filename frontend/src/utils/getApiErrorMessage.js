export const getApiErrorMessage = (err, fallback = "Something went wrong") => {
  const detail = err?.response?.data?.detail;

  if (typeof detail === "string" && detail.trim()) return detail;

  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0];

    if (typeof first === "string" && first.trim()) return first;

    if (first && typeof first === "object") {
      const msg = typeof first.msg === "string" ? first.msg : "Validation error";
      const loc = Array.isArray(first.loc) ? first.loc.slice(1).join(".") : "";
      return loc ? `${loc}: ${msg}` : msg;
    }

    return fallback;
  }

  if (detail && typeof detail === "object") {
    if (typeof detail.msg === "string" && detail.msg.trim()) return detail.msg;
  }

  if (typeof err?.message === "string" && err.message.trim()) return err.message;

  return fallback;
};
