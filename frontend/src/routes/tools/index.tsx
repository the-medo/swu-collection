import { createFileRoute, Link } from '@tanstack/react-router';
import { Helmet } from 'react-helmet-async';

export const Route = createFileRoute('/tools/')({
  component: ToolsLayout,
});

function ToolsLayout() {
  return (
    <>
      <Helmet title="SWU Tools | SWUBase" />
      <div className="container mx-auto p-2">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <ToolCard
            title="Deck Format Converter"
            description="Transform decklists from melee.gg or text format into JSON"
            path="/tools/deck-format-converter"
          />
        </div>
      </div>
    </>
  );
}

interface ToolCardProps {
  title: string;
  description: string;
  path: string;
}

function ToolCard({ title, description, path }: ToolCardProps) {
  return (
    <Link
      to={path}
      className="block p-4 border rounded-lg transition-colors duration-150 hover:bg-gray-50 dark:hover:bg-gray-800"
    >
      <h2 className="text-lg font-semibold mb-2">{title}</h2>
      <p className="text-gray-600 dark:text-gray-300">{description}</p>
    </Link>
  );
}
