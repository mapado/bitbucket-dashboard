export function compareUpdatedOn(a, b) {
  if (a.updated_on < b.updated_on) {
    return -1;
  }
  if (a.updated_on > b.updated_on) {
    return 1;
  }

  return 0;
}
