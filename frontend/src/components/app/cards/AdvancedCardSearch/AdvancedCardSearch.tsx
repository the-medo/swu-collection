import * as React from 'react';
import { getRouteApi } from '@tanstack/react-router';

interface AdvancedCardSearchProps {}

const routeApi = getRouteApi('/cards/search');

const AdvancedCardSearch: React.FC<AdvancedCardSearchProps> = ({}) => {
  const { q } = routeApi.useSearch();
  return <div>AdvancedCardSearch here: {q}</div>;
};

export default AdvancedCardSearch;
