/*
 * Maps the values of the months (0-indexed) with a 3 character string representation
 */
const monthsMap = {
  0: 'Jan',
  1: 'Feb',
  2: 'Mar',
  3: 'Apr',
  4: 'May',
  5: 'Jun',
  6: 'Jul',
  7: 'Ago',
  8: 'Sep',
  9: 'Oct',
  10: 'Nov',
  11: 'Dec'
};

/*
 * Format the label to be used in the chart
 */
const getLabel = (month, year) => {
  const monthStr = monthsMap[month];
  const yearStr = year.toString().substring(2, 4);
  return `${monthStr} '${yearStr}`;
};

/*
 * Function used to sort the array of deposits by timestamp
 */
const compareDeposits = (deposit1, deposit2) => {
  if (deposit1.timestamp > deposit2.timestamp) {
    return 1;
  }
  if (deposit1.timestamp < deposit2.timestamp) {
    return -1;
  }
  return 0;
}

/*
 * Prepare the dataset to be rendered in the chat
 * The Chart.js library requires two arrays:
 * labels: An array for the labels (to be used in the x axis)
 * data: An array with the values
 */
const prepareDataset = (deposits) => {
  const labels = [];
  const data = [];

  let month;
  let year;
  let sum = 0;
  
  // Sort deposits by timestamp
  deposits.sort(compareDeposits);

  // Iterate over the deposits and create the dataset
  for (let i = 0; i < deposits.length; i++) {
    const deposit = deposits[i];

    // Get month and year of deposit
    const date = new Date(deposit.timestamp * 1000);
    const depositMonth = date.getMonth();
    const depositYear = date.getFullYear();

    // Convert value from wei to eth
    const value = deposit.value / Math.pow(10, 18);

    // Add initial month/year to the data structure
    if (!month && !year) {
      month = depositMonth;
      year = depositYear;
      labels.push(getLabel(month, year));
      data.push(sum);
    }

    sum += value;

    if (depositMonth === month && depositYear === year) {
      // Deposit in the same month
      data[data.length - 1] = Math.round(sum * 100) / 100; // two decimal places
    } else {
      // A deposit in a new month. TODO if month is not the next one, fill the gaps
      month = depositMonth;
      year = depositYear;

      labels.push(getLabel(month, year));
      data.push(Math.round(sum * 100) / 100); // sum += value;
    }
  }
  return { labels, data };
}

module.exports = prepareDataset;
