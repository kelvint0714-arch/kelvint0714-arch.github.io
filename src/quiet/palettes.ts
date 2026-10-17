export type Tone = 'ivory' | 'rose' | 'teal' | 'purple' | 'gold' | 'dark' | 'water' | 'leaf' | 'white';
export type Material = [
    string,
    string,
    string
]; // top, west-lit face, east shadow
export interface Palette {
    background: string;
    ink: string;
    muted: string;
    accent: string;
    materials: Record<Tone, Material>;
}
export const DAY: Palette = { background: '#e9f0ec', ink: '#3c5157', muted: '#798b8c', accent: '#aa6959', materials: {
        ivory: ['#fff2db', '#f0d8bd', '#c5b1c0'], rose: ['#f6c2a8', '#e1a294', '#b48598'],
        teal: ['#96c8be', '#689e9d', '#527c8b'], purple: ['#d5bbd9', '#b695bf', '#847b9f'],
        gold: ['#f4dba1', '#d7b978', '#ab8e67'], dark: ['#526b79', '#405365', '#353f54'],
        water: ['#99cfc7', '#73b2b3', '#689da9'], leaf: ['#c1cbbc', '#96b5a6', '#749592'],
        white: ['#fffef3', '#fff6e7', '#d9cad4'],
    } };
export const DUSK: Palette = { background: '#263949', ink: '#e6dce0', muted: '#adb1bf', accent: '#e6b19f', materials: {
        ivory: ['#d8c9cc', '#a7a9ba', '#737c9c'], rose: ['#c794a3', '#9e7d99', '#6a6a90'],
        teal: ['#89abb3', '#617c98', '#455d7e'], purple: ['#b5a0c2', '#927ca9', '#65648b'],
        gold: ['#eed69f', '#c2a782', '#8d7c87'], dark: ['#414e70', '#354361', '#26334e'],
        water: ['#688fa4', '#4b778d', '#45627e'], leaf: ['#9ba4b1', '#7a8f9b', '#5d7088'],
        white: ['#fff5df', '#e8d9d9', '#b1b0c5'],
    } };
/** Chapter colour changes are small: the architecture remains one coherent place. */
export const CHAPTERS = [
    { id: '', no: 'I', name: 'A quiet valley', line: 'A path between ideas.', color: '#aa6959' },
    { id: 'about', no: '01', name: 'The lotus courtyard', line: 'A little about the traveller.', color: '#bd7f89' },
    { id: 'research', no: '02', name: 'The moon gate', line: 'Questions worth following.', color: '#8b80a5' },
    { id: 'projects', no: '03', name: 'The turning bridge', line: 'Ideas, made tangible.', color: '#b18754' },
    { id: 'activity', no: '04', name: 'The long stair', line: 'A little further, every day.', color: '#608b93' },
    { id: 'contact', no: '05', name: 'The violet garden', line: 'Every journey starts with a hello.', color: '#a17ba0' },
];
