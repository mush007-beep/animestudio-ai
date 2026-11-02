"use client";

import CharacterManager from "@/components/CharacterManager";

export default function CharactersPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Characters</h1>
      <p className="text-sm text-neutral-500 mb-6">
        Locked looks for continuity — copy the description into worker prompts,
        or attach the reference image in the notebook.
      </p>
      <CharacterManager />
    </div>
  );
}
