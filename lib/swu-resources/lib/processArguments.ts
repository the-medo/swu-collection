// Process arguments in format --key=value

export const processArguments = () => {
  const params: Record<string, string> = {};

  const args = process.argv.slice(2);

  args.forEach(arg => {
    if (arg.startsWith('--')) {
      const paramString = arg.substring(2);
      const firstEqualIndex = paramString.indexOf('=');

      if (firstEqualIndex !== -1) {
        const key = paramString.substring(0, firstEqualIndex);
        const value = paramString.substring(firstEqualIndex + 1);

        if (key && value) {
          params[key] = value;
        }
      }
    }
  });

  return params;
};
