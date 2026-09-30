// All geographic assets use this region's origin and extent. Later region packs
// can ship their own bounds, snapshots, landmarks, and destination inventories.
export const cityRegion = {
  id: 'charlottesville',
  name: 'Charlottesville',
  origin: [-78.489, 38.030],
  bounds: [-78.526, 38.016, -78.462, 38.055],
  snapshot: '/data/city.json',
};
export const futureRegions = [
  { id: 'albemarle', name: 'Albemarle County', status: 'future' },
  { id: 'monticello', name: 'Monticello', status: 'future' },
  { id: 'blue-ridge', name: 'Blue Ridge Mountains', status: 'future' },
];
