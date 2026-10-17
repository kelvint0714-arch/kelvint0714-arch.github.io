// Keep the existing WebGL experience available without deleting its source or personal data.
// Roll back instantly with ?legacy, or restore index.html's /src/main.ts entry.
if(new URLSearchParams(location.search).has('legacy')){
 import('./main');
}else{
 import('./quiet/main');
}
export {};
