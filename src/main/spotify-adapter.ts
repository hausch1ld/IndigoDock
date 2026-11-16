// Self-contained: serialized into an isolated world, without exposing Node APIs.
export function spotifyAdapter(action = "read", value = 1) {
  const media =
    Array.from(document.querySelectorAll<HTMLMediaElement>("audio,video")).find(
      (m) => !m.paused,
    ) ?? document.querySelector<HTMLMediaElement>("audio,video");
  const slider = document.querySelector<HTMLInputElement>(
    'input[data-testid="volume-bar"], [data-testid="volume-bar"] input, input[aria-label*="Lautstärke"], input[aria-label*="Volume"], input[aria-label*="volume"]',
  );
  const shuffle = document.querySelector<HTMLButtonElement>(
    '[data-testid="control-button-shuffle"]',
  );
  const repeat = document.querySelector<HTMLButtonElement>(
    '[data-testid="control-button-repeat"]',
  );
  const active = (button: HTMLButtonElement | null) =>
    button?.getAttribute("aria-checked") === "true" ||
    button?.getAttribute("aria-pressed") === "true";
  if (action === "mute") {
    const mute = document.querySelector<HTMLButtonElement>(
      '[data-testid="volume-bar-toggle-mute-button"], [data-testid="volume-bar-toggle-mute"]',
    );
    if (mute) {
      mute.click();
      return true;
    }
    const current = slider
      ? (Number(slider.value) - Number(slider.min || 0)) /
        (Number(slider.max || 1) - Number(slider.min || 0))
      : (media?.volume ?? 0);
    const target = slider ?? media;
    if (!target) return false;
    if (current > 0) {
      target.dataset.indigoPreviousVolume = String(current);
      value = 0;
    } else value = Number(target.dataset.indigoPreviousVolume || 1);
    action = "volume";
  }
  const playbackButton = document.querySelector<HTMLButtonElement>(
    '[data-testid="control-button-playpause"]',
  );
  const playbackLabel = playbackButton?.getAttribute("aria-label") ?? "";
  const playback = navigator.mediaSession?.playbackState;
  const paused = /pause|pausieren/i.test(playbackLabel)
    ? false
    : /play|wiedergabe|abspielen|fortsetzen/i.test(playbackLabel)
      ? true
      : playback === "playing"
        ? false
        : playback === "paused"
          ? true
          : (media?.paused ?? true);
  if (action === "read") {
    const metadata = navigator.mediaSession?.metadata;
    const min = Number(slider?.min || 0),
      max = Number(slider?.max || 1);
    return {
      title: metadata?.title || "",
      artist: metadata?.artist || "",
      cover: metadata?.artwork?.[0]?.src || "",
      paused,
      volume:
        slider && max > min
          ? (Number(slider.value) - min) / (max - min)
          : (media?.volume ?? 1),
      available: !!slider || !!media,
      shuffle: active(shuffle),
      repeat: active(repeat),
      repeatOne: /(?:repeat one|einzeltitel|einen titel|1 wiederholen)/i.test(
        repeat?.getAttribute("aria-label") ?? "",
      ),
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
    shuffle: "control-button-shuffle",
    repeat: "control-button-repeat",
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
