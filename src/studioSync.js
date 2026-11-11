const RECORD_LISTS = ["clients", "library", "approvals", "calendar", "tracking", "blogs", "blogCalendar"];

function studioHasRecords(state) {
  if (!state || typeof state !== "object") return false;
  if (state.activeClientId) return true;
  const brief = state.brief || {};
  if (brief.brand || brief.audience || brief.keyMessage || brief.constraints) return true;
  const voice = state.voice || {};
  if (voice.samples || voice.profile) return true;
  return RECORD_LISTS.some((key) => Array.isArray(state[key]) && state[key].length > 0);
}

function studioSyncPlan(server, local) {
  if (!server || !Array.isArray(server.clients)) return "offline";
  if (studioHasRecords(server)) return "adopt";
  if (studioHasRecords(local)) return "upload";
  return "ready";
}

function studioSnapshot(state) {
  return {
    clients: state.clients || [],
    activeClientId: state.activeClientId || "",
    brief: state.brief || {},
    library: state.library || [],
    approvals: state.approvals || [],
    calendar: state.calendar || [],
    tracking: state.tracking || [],
    templates: state.templates || [],
    voice: state.voice || { samples: "", profile: "" },
    blogs: state.blogs || [],
    blogCalendar: state.blogCalendar || [],
  };
}

function imageStudioLink(imageStudioUrl, item, client) {
  const base = String(imageStudioUrl || "").trim().replace(/\/+$/, "");
  if (!base || !item) return "";
  const params = new URLSearchParams();
  const prompt = String(item.text || "").slice(0, 6000);
  if (prompt) params.set("prompt", prompt);
  const name = client?.businessName || "";
  if (name) params.set("client", name);
  const colors = client?.colors || client?.brandColors || "";
  if (colors) params.set("colors", colors);
  const style = client?.brandVoice || "";
  if (style) params.set("style", style);
  const query = params.toString();
  return query ? `${base}/?${query}` : `${base}/`;
}

export {
  studioHasRecords,
  studioSyncPlan,
  studioSnapshot,
  imageStudioLink,
};
