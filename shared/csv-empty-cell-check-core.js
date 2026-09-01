import { columnLabel, validateCsv } from './csv-columns-core.js';

/**
 * Finds only data-row cells whose parsed value is exactly the empty string.
 * CSV parsing and validation are delegated to shared/csv-columns-core.js.
 */
export function checkEmptyCells(records) {
  const { headers, dataRows, columnCount } = validateCsv(records);
  const labels = headers.map((_, index) => columnLabel(headers, index));
  const emptyCounts = Array(columnCount).fill(0);
  const emptyCells = [];
  let rowsWithEmptyCount = 0;

  dataRows.forEach((row, dataRowIndex) => {
    let rowHasEmpty = false;

    row.forEach((value, columnIndex) => {
      if (value !== '') return;

      rowHasEmpty = true;
      emptyCounts[columnIndex] += 1;
      emptyCells.push({
        recordNumber: dataRowIndex + 2,
        dataRowNumber: dataRowIndex + 1,
        columnIndex,
        header: labels[columnIndex]
      });
    });

    if (rowHasEmpty) rowsWithEmptyCount += 1;
  });

  return {
    dataRowCount: dataRows.length,
    columnCount,
    emptyCellCount: emptyCells.length,
    rowsWithEmptyCount,
    columns: headers.map((_, columnIndex) => ({
      columnIndex,
      header: labels[columnIndex],
      emptyCount: emptyCounts[columnIndex]
    })),
    emptyCells
  };
}

// Keep a descriptive alias available for callers that phrase the operation as a search.
export const findEmptyCells = checkEmptyCells;
