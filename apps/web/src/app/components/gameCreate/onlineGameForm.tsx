import { Button } from "../ui/button";
import { Input } from "../ui/input";

type OnlineGameFormProps = {
  disabled?: boolean;
};

export function OnlineGameForm({ disabled = false }: OnlineGameFormProps) {
  return (
    <fieldset disabled={disabled} className="min-w-0">
      <Input placeholder="Your name" aria-label="Your name" maxLength={50} />

      <Button type="button" size="lg" className="mt-6">
        Create game
      </Button>
    </fieldset>
  );
}
