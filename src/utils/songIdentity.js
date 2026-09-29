// Serializes song data for change detection, excluding fields that change
// continuously during playback (so themes don't re-animate every poll).
export default function songIdentity(data) {
  if (!data) return JSON.stringify(data);
  const { progress_ms, duration_ms, ...rest } = data;
  return JSON.stringify(rest);
}
