import { Button } from "../ui/button";
import { Input } from "../ui/input";

export function OnlineGameForm() {
  return (
    <>
      <div>
        <h2 className="text-base font-semibold">
          Player name
        </h2>

        <p className="mt-1 text-sm text-neutral-500">
          Enter your name to create an online game.
        </p>
      </div>

      <div className="mt-6">
        <Input
          placeholder="Your name"
          maxLength={50}
        />
      </div>

      <Button type="button" className="mt-6 w-full">
        Create game
      </Button>
    </>
  );
}