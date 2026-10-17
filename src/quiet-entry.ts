// The page's entry. By default the WebGL valley (src/main.ts); ?v2 opens the Canvas 2D prototype
// (src/quiet/), kept whole and reachable. ?legacy also opens the WebGL valley (old links keep
// working).
if (new URLSearchParams(location.search).has('v2')) {
  import('./quiet/main');
} else {
  import('./main');
}
export {};
