/**
 * Illustration palette. Depth is sold with atmospheric perspective:
 * things further away sit closer to the sky colour, nearer things go darker.
 */
export const NIGHT = {
  mountainsTop: '#262b5e',
  mountains: '#1d2250',
  hills: '#161a42',
  town: '#0f1231',
  townFront: '#0c0f2a',
  field: '#0b0e27',
  trees: '#090c22',
  ground: '#07091b',
  groundRim: '#2b3166',
  foreground: '#03040c',
  cloud: '#3b3b74',
  cloudLight: '#5a5891',
  moon: '#f6e8c6',
  windowLit: '#ffd68a',
  lamp: '#ffe4a6',
  lampGlow: '255, 206, 128',

  // forest (darker the nearer it is)
  forestFar: '#13173d',
  forestMid: '#0c0f2c',
  forestNear: '#07091c',
  forestRim: '#232858',
  mist: '#2e2f66',
  firefly: '255, 236, 150',

  // mountain
  peakFar: '#272c5e',
  peakFarTop: '#30356a',
  rockMid: '#171b43',
  rock: '#0a0c22',
  rockRim: '#2f3570',
  snow: '#5d6196',

  // above the clouds
  cloudSea: '#2a2c5f',
  cloudSeaLight: '#55578f',
  summitRock: '#0b0d24',
  summitRim: '#373d7a',
};

/** The boy. Used by every scene so he never drifts off-model. */
export const BOY = {
  skin: '#efcdaa',
  skinShade: '#d9ad8a',
  blush: '#e8957f',
  hair: '#2a2140',
  hoodie: '#4f5c98',
  hoodieShade: '#404b84',
  hoodieDark: '#353f72',
  hoodieLight: '#6874b0',
  trousers: '#2b3158',
  trousersBack: '#222748',
  shoe: '#1c1a2c',
  sole: '#a99d8c',
  scarf: '#f2c14e',
  scarfShade: '#d9a23a',
  scarfDeep: '#c18a2e',
  pack: '#8c5a43',
  packFlap: '#a26c50',
  packStrap: '#4a3430',
  shadow: 'rgba(0, 0, 0, 0.45)',
};
