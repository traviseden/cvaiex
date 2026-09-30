export function mallLayout(catalog) {
  const config = catalog.district.streetscape;
  const width = config?.width ?? 36;
  const pavilion = catalog.landmarks?.find(item => item.kind === 'pavilion');
  return {
    width, halfWidth: width / 2,
    treeOffset: config?.treeOffset ?? 3,
    treeSpacing: config?.treeSpacing ?? 26,
    walkLane: config?.walkLane ?? 11.5,
    end: Math.max(catalog.district.length, (pavilion?.along ?? catalog.district.length) + 32),
  };
}
