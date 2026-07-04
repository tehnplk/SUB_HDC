function compareVersions(left, right) {
  const leftParts = String(left || "").split(".").map((part) => Number(part) || 0);
  const rightParts = String(right || "").split(".").map((part) => Number(part) || 0);
  const length = Math.max(leftParts.length, rightParts.length);

  for (let index = 0; index < length; index += 1) {
    const diff = (leftParts[index] || 0) - (rightParts[index] || 0);
    if (diff !== 0) return diff;
  }

  return 0;
}

export function getMaxUpdateVersion(updateLog) {
  if (!Array.isArray(updateLog) || updateLog.length === 0) {
    return "";
  }

  return updateLog
    .map((item) => String(item?.version || "").trim())
    .filter(Boolean)
    .reduce((maxVersion, version) => (
      compareVersions(version, maxVersion) > 0 ? version : maxVersion
    ), "");
}
