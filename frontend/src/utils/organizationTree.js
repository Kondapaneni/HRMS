/**
 * Construct the reporting tree from the complete authorized roster. Support
 * manager references that use a database row ID, employee code or user ID.
 * Prevent duplicated nodes, self-reporting and cycles.
 */
export function buildOrganizationTree(employees = []) {
  const nodes = new Map();
  const byCode = new Map();
  const byUser = new Map();
  for (const employee of employees) {
    if (!employee?.id || nodes.has(String(employee.id))) continue;
    const node = { ...employee, children: [] };
    nodes.set(String(employee.id), node);
    if (employee.employeeId) byCode.set(String(employee.employeeId), node);
    if (employee.userId) byUser.set(String(employee.userId), node);
  }
  const parents = new Map();
  for (const node of nodes.values()) {
    if (!node.managerId) continue;
    const key = String(node.managerId);
    const parent = nodes.get(key) || byCode.get(key) || byUser.get(key);
    if (parent && String(parent.id) !== String(node.id)) {
      parents.set(String(node.id), String(parent.id));
    }
  }
  for (const id of nodes.keys()) {
    const visited = new Set([id]);
    let ancestor = parents.get(id);
    while (ancestor) {
      if (visited.has(ancestor)) {
        parents.delete(id);
        break;
      }
      visited.add(ancestor);
      ancestor = parents.get(ancestor);
    }
  }
  const roots = [];
  for (const node of nodes.values()) {
    const parent = nodes.get(parents.get(String(node.id)));
    if (parent) parent.children.push(node);
    else roots.push(node);
  }
  return roots;
}
