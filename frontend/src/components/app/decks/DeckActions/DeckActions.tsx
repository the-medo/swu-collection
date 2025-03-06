interface DeckActionsProps {
  deckId: string;
}

const DeckActions: React.FC<DeckActionsProps> = ({ deckId }) => {
  return <div>Deck actions here {deckId}</div>;
};

export default DeckActions;
