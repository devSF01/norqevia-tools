export const CSV_PREVIEW_DATA_ROW_LIMIT = 20;

/** Creates a bounded, text-only table preview for validated CSV records. */
export function createCsvPreviewTable(records, dataRowLimit = CSV_PREVIEW_DATA_ROW_LIMIT) {
  const table = document.createElement('table');
  const head = document.createElement('thead');
  const headRow = document.createElement('tr');

  records[0].forEach((value) => {
    const cell = document.createElement('th');
    cell.scope = 'col';
    cell.textContent = value;
    headRow.append(cell);
  });
  head.append(headRow);
  table.append(head);

  const body = document.createElement('tbody');
  records.slice(1, 1 + dataRowLimit).forEach((row) => {
    const tableRow = document.createElement('tr');
    row.forEach((value) => {
      const cell = document.createElement('td');
      cell.textContent = value;
      tableRow.append(cell);
    });
    body.append(tableRow);
  });
  table.append(body);
  return table;
}
