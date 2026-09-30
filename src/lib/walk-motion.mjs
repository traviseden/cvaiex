export function moveWalker(position, delta, bounds, obstacles, radius = .35) {
  const result = { x: position.x, z: position.z };
  const steps = Math.max(1, Math.ceil(Math.hypot(delta.x, delta.z) / .15));
  const blocked = (x, z) => obstacles.some(box => x > box.minX - radius && x < box.maxX + radius && z > box.minZ - radius && z < box.maxZ + radius);
  for (let i = 0; i < steps; i++) {
    const x = Math.max(bounds.minX + radius, Math.min(bounds.maxX - radius, result.x + delta.x / steps));
    if (!blocked(x, result.z)) result.x = x;
    const z = Math.max(bounds.minZ + radius, Math.min(bounds.maxZ - radius, result.z + delta.z / steps));
    if (!blocked(result.x, z)) result.z = z;
  }
  return result;
}
