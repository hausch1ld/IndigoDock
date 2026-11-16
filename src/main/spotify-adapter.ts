// Self-contained: serialized into an isolated world, without exposing Node APIs.
export function spotifyAdapter(action = "read", value = 1) {
  const media =
    Array.from(document.querySelectorAll<HTMLMediaElement>("audio,video")).find(
      (m) => !m.paused,
    ) ?? document.querySelector<HTMLMediaElement>("audio,video");
  const slider = document.querySelector<HTMLInputElement>(
    'input[data-testid="volume-bar"], [data-testid="volume-bar"] input, input[aria-label*="Lautstärke"], input[aria-label*="Volume"], input[aria-label*="volume"]',
  );
  if (action === "read") {
    const metadata = navigator.mediaSession?.metadata;
    const min = Number(slider?.min || 0),
      max = Number(slider?.max || 1);
    return {
      title: metadata?.title || "",
      artist: metadata?.artist || "",
      cover: metadata?.artwork?.[0]?.src || "",
      paused: media
        ? media.paused
        : navigator.mediaSession?.playbackState !== "playing",
      volume:
        slider && max > min
          ? (Number(slider.value) - min) / (max - min)
          : (media?.volume ?? 1),
      available: !!slider || !!media,
    };
  }
  if (action === "volume") {
    if (slider) {
      const min = Number(slider.min || 0),
        max = Number(slider.max || 1);
      const setter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      )?.set;
      if (!setter || max <= min) return false;
      setter.call(
        slider,
        String(min + Math.max(0, Math.min(1, value)) * (max - min)),
      );
      slider.dispatchEvent(new Event("input", { bubbles: true }));
      slider.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    }
    if (!media) return false;
    media.volume = value;
    return true;
  }
  const names: Record<string, string> = {
    toggle: "control-button-playpause",
    next: "control-button-skip-forward",
    previous: "control-button-skip-back",
  };
  const button = document.querySelector<HTMLButtonElement>(
    '[data-testid="' + names[action] + '"]',
  );
  if (button) {
    button.click();
    return true;
  }
  if (action === "toggle" && media) {
    if (media.paused) void media.play();
    else media.pause();
    return true;
  }
  return false;
}
