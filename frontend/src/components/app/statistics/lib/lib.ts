export const getResultColor = (result?: number) => {
  switch (result) {
    case 3:
      return 'bg-green-500 hover:bg-green-600';
    case 1:
      return 'bg-yellow-500 hover:bg-yellow-600';
    case 0:
      return 'bg-red-500 hover:bg-red-600';
    default:
      return 'bg-gray-500';
  }
};

export const getResultBorderColor = (result?: number) => {
  switch (result) {
    case 3:
      return 'border-green-500';
    case 1:
      return 'border-yellow-500';
    case 0:
      return 'border-red-500';
    default:
      return 'border-gray-500';
  }
};

export const getResultText = (result?: number) => {
  switch (result) {
    case 3:
      return 'Win';
    case 1:
      return 'Draw';
    case 0:
      return 'Loss';
    default:
      return 'Unknown';
  }
};
