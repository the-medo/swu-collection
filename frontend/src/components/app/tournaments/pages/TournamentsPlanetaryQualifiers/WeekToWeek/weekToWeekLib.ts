const basicAxisDefinition = {
  tickSize: 5,
  tickPadding: 5,
  tickRotation: 0,
  legend: 'Week',
  legendPosition: 'middle',
  style: {
    ticks: {
      text: { fill: 'hsl(var(--muted-foreground))' },
    },
    legend: {
      text: { fill: 'hsl(var(--muted-foreground))' },
    },
  },
};

export const topAxisDefinition = { ...basicAxisDefinition, legendOffset: -36 };
export const bottomAxisDefinition = { ...basicAxisDefinition, legendOffset: 32 };
