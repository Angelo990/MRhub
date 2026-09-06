export function normalizeOrder(order: string[], validIds: string[]) {
    const seen = new Set<string>();
    const normalized = order.filter((id) => validIds.includes(id) && !seen.has(id) && seen.add(id));

    for (const id of validIds) {
        if (!seen.has(id)) {
            normalized.push(id);
        }
    }

    return normalized;
}

export function reorderIds(ids: string[], activeId: string, targetId: string) {
    if (activeId === targetId) {
        return ids;
    }

    const activeIndex = ids.indexOf(activeId);
    const targetIndex = ids.indexOf(targetId);

    if (activeIndex === -1 || targetIndex === -1) {
        return ids;
    }

    const next = [...ids];
    const [moved] = next.splice(activeIndex, 1);
    next.splice(targetIndex, 0, moved);

    return next;
}