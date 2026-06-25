import type { SceneMode } from "@/lib/sceneData";

type RobotAvatarProps = {
  mode: SceneMode;
};

const robotByMode: Record<SceneMode, string> = {
  focus: "/robot/study.png",
  escape: "/robot/window.png",
  chill: "/robot/idle.png",
  energy: "/robot/dance.png",
  worship: "/robot/reflect.png",
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
        style={{ backgroundImage: `url(${robotByMode[mode]})` }}
      />
    </div>
  );
}
