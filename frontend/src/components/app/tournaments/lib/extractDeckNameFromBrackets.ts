export const extractDeckNameFromBrackets = (fullName: string) => {
  const bracketMatch = fullName.match(/\[(.*?)\]/);
  return bracketMatch ? bracketMatch[1] : fullName;
};
