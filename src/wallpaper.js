// Background decoration follows the active campaign and known in-game events.
// It never uses the real-world calendar or modifies game state.
globalThis.PptWallpaper = (() => {
  const events = new Set(['ny','bf','sale11','sept','chaos']);
  function appearance(chapter, day, event, branchId) {
    if (chapter !== 'village' && chapter !== 'town' && chapter !== 'city' && chapter !== 'city-center' && chapter !== 'capital') return null;
    const safeDay = Number.isFinite(day) && day > 0 ? Math.floor(day) : 1;
    const result = {chapter, season: event === 'ny' ? 'winter' : 'normal',
      event: events.has(event) ? event : 'none', light: safeDay % 2 ? 'warm' : 'clear'};
    if (chapter === 'capital') result.district = branchId === 2 ? 'center' : 'outskirts';
    return result;
  }
  function update(body, chapter, day, event, branchId) {
    if (!body || !body.dataset) return;
    const value = appearance(chapter, day, event, branchId);
    if (!value) {
      for (const key of ['wallpaper','wallpaperSeason','wallpaperEvent','wallpaperLight','wallpaperDistrict']) delete body.dataset[key];
      return;
    }
    body.dataset.wallpaper = value.chapter;
    body.dataset.wallpaperSeason = value.season;
    body.dataset.wallpaperEvent = value.event;
    body.dataset.wallpaperLight = value.light;
    if (value.district) body.dataset.wallpaperDistrict = value.district;
    else delete body.dataset.wallpaperDistrict;
  }
  return Object.freeze({appearance, update});
})();
