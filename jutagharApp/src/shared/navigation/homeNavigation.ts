type HomeNavigationListener = () => void;

let listener: HomeNavigationListener | null = null;

export function setHomeNavigationListener(next: HomeNavigationListener | null) {
  listener = next;
}

export function triggerHomeNavigation() {
  listener?.();
}
