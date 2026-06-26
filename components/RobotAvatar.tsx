import type { SceneMode } from "@/lib/sceneData";

type RobotAvatarProps = {
  mode: SceneMode;
};

const motionByMode: Record<SceneMode, string> = {
  focus: "robot-motion-focus",
  escape: "robot-motion-escape",
  chill: "robot-motion-chill",
  energy: "robot-motion-energy",
  worship: "robot-motion-worship",
};

export default function RobotAvatar({ mode }: RobotAvatarProps) {
  return (
    <div className={`robot-stage robot-stage-${mode}`}>
      <div
        aria-label={`${mode} robot avatar`}
        className={`robot-avatar robot-avatar-${mode} ${motionByMode[mode]}`}
        role="img"
      >
        <span className="robot-avatar-core" aria-hidden="true" />
        <span className="robot-avatar-visor" aria-hidden="true" />
        <span
          className="robot-avatar-orbit robot-avatar-orbit-left"
          aria-hidden="true"
        />
        <span
          className="robot-avatar-orbit robot-avatar-orbit-right"
          aria-hidden="true"
        />
      </div>
    </div>
  );
}
