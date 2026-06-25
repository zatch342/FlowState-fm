import RobotAvatar from "@/components/RobotAvatar";
import { sceneData, type SceneMode } from "@/lib/sceneData";

type FlowSceneProps = {
  mode: SceneMode;
};

export default function FlowScene({ mode }: FlowSceneProps) {
  const scene = sceneData[mode];

  return (
    <section className="flow-scene-ambient w-full overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950">
      <div
        aria-label={`${scene.title} visual scene`}
        className="flow-scene-fade relative min-h-[280px] bg-cover bg-center sm:min-h-[360px]"
        key={mode}
        role="img"
        style={{ backgroundImage: `url(${scene.image})` }}
      >
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <RobotAvatar mode={mode} />
        </div>
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-6">
          <p className="text-3xl font-bold">{scene.title}</p>
          <p className="mt-1 text-zinc-300">{scene.subtitle}</p>
        </div>
      </div>
    </section>
  );
}
