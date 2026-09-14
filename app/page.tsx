import { GameShell } from "@/components/game-shell";
import { Providers } from "@/components/providers";

export default function Home() {
  return (
    <Providers>
      <GameShell />
    </Providers>
  );
}
